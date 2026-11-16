import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { login } from '@/lib/subsonic/login'
import { useSessionStore } from '@/stores/session'

export const Route = createFileRoute('/login')({
  validateSearch: z.object({ redirect: z.string().optional() }),
  beforeLoad: ({ search }) => {
    if (useSessionStore.getState().session) throw redirect({ to: search.redirect ?? '/' })
  },
  component: LoginPage,
})

const schema = z.object({
  url: z.string().trim().min(1, 'Enter your server address'),
  username: z.string().trim().min(1, 'Enter your username'),
  password: z.string().min(1, 'Enter your password'),
})
type FormValues = z.infer<typeof schema>

function LoginPage() {
  const search = Route.useSearch()
  const navigate = useNavigate()
  const setSession = useSessionStore((s) => s.setSession)
  // Pre-fill the last server so re-logging in is quicker.
  const lastUrl = localStorage.getItem('coffee.lastServer') ?? ''

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { url: lastUrl, username: '', password: '' },
  })

  const mutation = useMutation({
    mutationFn: (v: FormValues) => login(v.url, v.username, v.password),
    onSuccess: (session) => {
      localStorage.setItem('coffee.lastServer', session.credentials.url)
      setSession(session)
      navigate({ to: search.redirect ?? '/', replace: true })
    },
  })

  const { errors } = form.formState

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-10 flex flex-col items-center gap-4 text-center">
          <img src="/icon.png" alt="" className="size-20" />
          <div>
            <h1 className="text-4xl font-thin tracking-wide">Coffee</h1>
            <p className="mt-1 text-sm text-muted-foreground">Connect to your Navidrome server</p>
          </div>
        </div>

        <form className="flex flex-col gap-5" onSubmit={form.handleSubmit((v) => mutation.mutate(v))} noValidate>
          <Field id="url" label="Server" error={errors.url?.message}>
            <Input
              id="url"
              placeholder="https://music.example.com"
              autoComplete="url"
              inputMode="url"
              aria-invalid={!!errors.url}
              {...form.register('url')}
            />
          </Field>
          <Field id="username" label="Username" error={errors.username?.message}>
            <Input id="username" autoComplete="username" aria-invalid={!!errors.username} {...form.register('username')} />
          </Field>
          <Field id="password" label="Password" error={errors.password?.message}>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              aria-invalid={!!errors.password}
              {...form.register('password')}
            />
          </Field>

          {mutation.error && (
            <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {mutation.error.message}
            </p>
          )}

          <Button type="submit" size="lg" className="mt-2 h-10 uppercase tracking-wider" disabled={mutation.isPending}>
            {mutation.isPending ? 'Connecting…' : 'Connect'}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Your password isn't stored. Only a salted token is saved in this browser.
        </p>
      </div>
    </main>
  )
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id} className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
