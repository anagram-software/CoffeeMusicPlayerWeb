import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

interface PlaylistNameDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  submitLabel: string
  initialName?: string
  onSubmit: (name: string) => void
}

/** Name prompt for creating or renaming a playlist. */
export function PlaylistNameDialog({ open, onOpenChange, title, submitLabel, initialName = '', onSubmit }: PlaylistNameDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm" data-section="playlists" onClick={(e) => e.stopPropagation()}>
        {/* Keyed so the field resets each time the dialog opens */}
        {open && <NameForm key={initialName} title={title} submitLabel={submitLabel} initialName={initialName} onSubmit={(n) => (onSubmit(n), onOpenChange(false))} />}
      </DialogContent>
    </Dialog>
  )
}

function NameForm({ title, submitLabel, initialName, onSubmit }: Omit<PlaylistNameDialogProps, 'open' | 'onOpenChange'>) {
  const [name, setName] = useState(initialName ?? '')
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (name.trim()) onSubmit(name.trim())
      }}
    >
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Playlist name" aria-label="Playlist name" />
      <DialogFooter>
        <Button type="submit" disabled={!name.trim()}>
          {submitLabel}
        </Button>
      </DialogFooter>
    </form>
  )
}
