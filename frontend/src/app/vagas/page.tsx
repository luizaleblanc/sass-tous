'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { jobs, type Job, type JobFilters } from '@/lib/api'
import { ExternalLink, Mail } from 'lucide-react'
import { clsx } from 'clsx'

const SENIORITY_OPTIONS = ['', 'Estágio', 'Trainee', 'Junior', 'Pleno', 'Senior']
const MODALITY_OPTIONS  = ['', 'remoto', 'presencial', 'hibrido']
const LOCATION_OPTIONS  = ['', 'nacional', 'internacional']

function Badge({ text, variant = 'default' }: { text: string; variant?: 'default' | 'primary' | 'green' }) {
  return (
    <span className={clsx(
      'inline-flex items-center px-2 py-0.5 rounded text-2xs font-medium',
      variant === 'primary' && 'bg-primary/10 text-primary dark:text-primary-light',
      variant === 'green'   && 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      variant === 'default' && 'bg-gray-100 text-gray-600 dark:bg-dark-raised dark:text-gray-400',
    )}>
      {text}
    </span>
  )
}

export default function VagasPage() {
  const [data, setData]       = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<JobFilters>({})

  useEffect(() => {
    setLoading(true)
    jobs.list(filters)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [filters])

  function setFilter(key: keyof JobFilters, value: string) {
    setFilters(prev => ({ ...prev, [key]: value || undefined }))
  }

  return (
    <DashboardLayout>
      <div className="space-y-5 animate-fade-in">
        <div>
          <h1 className="text-2xl font-display font-semibold text-gray-900 dark:text-white">Vagas</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {loading ? 'Carregando...' : `${data.length} vagas encontradas`}
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'seniority' as const, label: 'Senioridade', options: SENIORITY_OPTIONS },
            { key: 'work_modality' as const, label: 'Modalidade', options: MODALITY_OPTIONS },
            { key: 'location_type' as const, label: 'Localizacao', options: LOCATION_OPTIONS },
          ].map(({ key, label, options }) => (
            <select
              key={key}
              value={filters[key] ?? ''}
              onChange={e => setFilter(key, e.target.value)}
              className="
                h-8 px-2 text-sm rounded
                bg-light-surface dark:bg-dark-surface
                border border-light-border dark:border-dark-border
                text-gray-700 dark:text-gray-300
                focus:border-primary outline-none
                transition-colors duration-150
              "
            >
              <option value="">{label}</option>
              {options.filter(Boolean).map(o => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          ))}
        </div>

        {/* Job list */}
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 rounded-lg bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border animate-pulse" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="py-16 text-center text-gray-500 dark:text-gray-500 text-sm">
            Nenhuma vaga encontrada. Rode uma automacao para importar vagas.
          </div>
        ) : (
          <ul className="space-y-2">
            {data.map(job => (
              <li
                key={job.id}
                className="
                  flex items-start justify-between gap-4 p-4 rounded-lg
                  bg-light-surface dark:bg-dark-surface
                  border border-light-border dark:border-dark-border
                  hover:border-primary/40 dark:hover:border-primary/40
                  transition-colors duration-150
                "
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {job.title}
                    </span>
                    {job.seniority && <Badge text={job.seniority} variant="primary" />}
                    {job.work_modality && <Badge text={job.work_modality} variant="green" />}
                    {job.location_type === 'internacional' && <Badge text="internacional" />}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{job.company}</p>
                  {(job.stacks?.length ?? 0) > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {job.stacks!.slice(0, 6).map(s => (
                        <Badge key={s} text={s} />
                      ))}
                      {job.stacks!.length > 6 && (
                        <Badge text={`+${job.stacks!.length - 6}`} />
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {job.application_type === 'email' && job.application_email ? (
                    <a
                      href={`mailto:${job.application_email}`}
                      className="flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <Mail size={12} /> Candidatar
                    </a>
                  ) : (
                    <a
                      href={job.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <ExternalLink size={12} /> Ver vaga
                    </a>
                  )}
                  {job.platform && <Badge text={job.platform} />}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DashboardLayout>
  )
}
