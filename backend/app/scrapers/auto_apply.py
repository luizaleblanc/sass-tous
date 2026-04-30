"""Platform-specific automated job application logic via Playwright."""

import logging
from dataclasses import dataclass
from playwright.async_api import Page, TimeoutError as PlaywrightTimeout

logger = logging.getLogger(__name__)


@dataclass
class ApplyResult:
    success: bool
    message: str


async def apply_for_job(page: Page, url: str, platform: str, user_data: dict) -> ApplyResult:
    """Routes to the correct apply strategy based on platform."""
    if platform == "linkedin":
        return await _apply_linkedin(page, url, user_data)
    if platform == "gupy":
        return await _apply_gupy(page, url, user_data)
    if platform == "remoteok":
        return await _apply_remoteok(page, url, user_data)
    if platform == "infojobs":
        return await _apply_infojobs(page, url, user_data)
    return ApplyResult(False, f"Auto-apply não suportado para '{platform}'")


async def _apply_linkedin(page: Page, url: str, user_data: dict) -> ApplyResult:
    """LinkedIn Easy Apply — requires authenticated session (li_at cookie)."""
    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=20000)

        # Detect Easy Apply button (authenticated + public views)
        apply_btn = page.locator(
            "button.jobs-apply-button, "
            "button[data-control-name='jobdetails_topcard_inapply'], "
            "button:has-text('Easy Apply'), "
            "button:has-text('Candidatura simplificada')"
        )

        if not await apply_btn.count():
            return ApplyResult(False, "Easy Apply indisponível — candidatura externa ou vaga fechada")

        await apply_btn.first.click(timeout=5000)

        modal = page.locator(
            ".jobs-easy-apply-modal, "
            "[data-test-modal='easy-apply-modal'], "
            "[aria-label='Easy Apply']"
        )
        try:
            await modal.wait_for(timeout=8000)
        except PlaywrightTimeout:
            return ApplyResult(False, "Modal Easy Apply não abriu — sessão pode ter expirado")

        # Iterate through form steps (max 10 to prevent infinite loops)
        for _ in range(10):
            # Fill phone number if the field is empty
            phone_input = modal.locator("input[name*='phone'], input[id*='phoneNumber']")
            if await phone_input.count() and not await phone_input.first.input_value():
                if user_data.get("phone"):
                    await phone_input.first.fill(user_data["phone"])

            # Prefer Submit over Next
            submit_btn = modal.locator(
                "button[aria-label='Submit application'], "
                "button:has-text('Submit application'), "
                "button:has-text('Enviar candidatura')"
            )
            next_btn = modal.locator(
                "button[aria-label='Continue to next step'], "
                "button:has-text('Next'), "
                "button:has-text('Review'), "
                "button:has-text('Próximo'), "
                "button:has-text('Revisar')"
            )

            if await submit_btn.count():
                await submit_btn.first.click(timeout=5000)
                await page.wait_for_timeout(2000)
                return ApplyResult(True, "Candidatura enviada via LinkedIn Easy Apply")

            if await next_btn.count():
                await next_btn.first.click(timeout=5000)
                await page.wait_for_timeout(1000)
                continue

            break

        return ApplyResult(False, "Formulário incompleto — perguntas adicionais requerem resposta manual")

    except Exception as e:
        logger.error(f"[auto-apply/linkedin] {e}")
        return ApplyResult(False, f"Erro: {e}")


async def _apply_gupy(page: Page, url: str, user_data: dict) -> ApplyResult:
    """Gupy application — navigates to job page and clicks apply button."""
    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=20000)

        apply_btn = page.locator(
            "button:has-text('Candidatar-se'), "
            "button:has-text('Quero me candidatar'), "
            "a:has-text('Candidatar-se'), "
            "[data-testid='apply-button']"
        )
        try:
            await apply_btn.first.wait_for(timeout=7000)
        except PlaywrightTimeout:
            return ApplyResult(False, "Vaga fechada ou não encontrada no Gupy")

        # Check if button is disabled (closed application)
        is_disabled = await apply_btn.first.get_attribute("disabled")
        btn_text = (await apply_btn.first.inner_text()).lower()
        if is_disabled or "encerrada" in btn_text or "fechada" in btn_text:
            return ApplyResult(False, "Vaga com candidatura encerrada")

        await apply_btn.first.click(timeout=5000)
        await page.wait_for_timeout(2000)

        # If redirected to login, Gupy requires an account
        if "login" in page.url or "signin" in page.url:
            return ApplyResult(False, "Gupy exige login — vincule uma conta Gupy para auto-aplicar")

        return ApplyResult(True, "Candidatura iniciada no Gupy")

    except Exception as e:
        logger.error(f"[auto-apply/gupy] {e}")
        return ApplyResult(False, f"Erro: {e}")


async def _apply_remoteok(page: Page, url: str, user_data: dict) -> ApplyResult:
    """RemoteOK — navigates to job detail and follows the external apply link."""
    try:
        # Normalize URL casing (remoteOK.com → remoteok.com)
        normalized = url.replace("remoteOK.com", "remoteok.com")
        await page.goto(normalized, wait_until="domcontentloaded", timeout=20000)

        # RemoteOK renders job details inside a <tr> — wait for it to expand
        await page.wait_for_timeout(2000)

        apply_btn = page.locator(
            "a.source_before_apply, "
            "a.button.source_before_apply, "
            "td.action a.button, "
            "a[href]:has-text('Apply for this position'), "
            "a[href]:has-text('Apply Now'), "
            "a[href]:has-text('Apply'), "
            ".apply a"
        )

        if not await apply_btn.count():
            # Fallback: grab any external link inside the job row
            external = page.locator("a[href^='http'][target='_blank']").first
            if await external.count():
                href = await external.get_attribute("href") or ""
                if href:
                    return ApplyResult(True, f"Link externo encontrado: {href}")
            return ApplyResult(False, "Botão Apply não encontrado — vaga pode ter sido removida do RemoteOK")

        href = await apply_btn.first.get_attribute("href") or ""
        if not href:
            return ApplyResult(False, "Link de aplicação vazio")

        if href.startswith("/"):
            href = f"https://remoteok.com{href}"

        return ApplyResult(True, f"Link de candidatura obtido: {href}")

    except Exception as e:
        logger.error(f"[auto-apply/remoteok] {e}")
        return ApplyResult(False, f"Erro: {e}")


async def _apply_infojobs(page: Page, url: str, user_data: dict) -> ApplyResult:
    """InfoJobs application flow."""
    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=20000)

        apply_btn = page.locator(
            "button:has-text('Candidatar'), "
            "a:has-text('Candidatar'), "
            "[data-testid='apply-cta']"
        )
        try:
            await apply_btn.first.wait_for(timeout=7000)
        except PlaywrightTimeout:
            return ApplyResult(False, "Vaga fechada ou não encontrada no InfoJobs")

        await apply_btn.first.click(timeout=5000)
        await page.wait_for_timeout(2000)

        if "login" in page.url:
            return ApplyResult(False, "InfoJobs exige login para candidatura")

        return ApplyResult(True, "Candidatura iniciada no InfoJobs")

    except Exception as e:
        logger.error(f"[auto-apply/infojobs] {e}")
        return ApplyResult(False, f"Erro: {e}")
