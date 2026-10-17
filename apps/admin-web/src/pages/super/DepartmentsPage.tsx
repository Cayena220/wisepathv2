import { departmentPalette, slugify, type Department } from '@wisepath/shared';
import { Archive, Building2, ChevronRight, Pencil, Plus, RotateCcw, UserPlus } from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { useActor } from '@/auth/AuthProvider';
import { EmptyState, ErrorState, PageHeader, StatusBadge } from '@/components/data/display';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/overlays';
import { Card, Field, Input, Skeleton, Textarea } from '@/components/ui/primitives';
import { createDepartment, setDepartmentStatus, updateDepartment, useDepartments, usePrograms } from '@/lib/data/catalog';
import { cn, errorMessage, pluralize } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

export function DepartmentForm({
  open,
  onOpenChange,
  department,
  nextOrder,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  department: Department | null;
  nextOrder: number;
}) {
  const actor = useActor();
  const [name, setName] = React.useState('');
  const [code, setCode] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [color, setColor] = React.useState<string>(departmentPalette[0]);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setName(department?.name ?? '');
    setCode(department?.code ?? '');
    setDescription(department?.description ?? '');
    setColor(department?.color ?? departmentPalette[nextOrder % departmentPalette.length]);
  }, [open, department, nextOrder]);

  const id = department?.id ?? slugify(code || name);
  const valid = name.trim().length >= 3 && code.trim().length >= 2 && code.trim().length <= 12 && id.length > 0;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const input = { name: name.trim(), code: code.trim().toUpperCase(), description: description.trim(), color };
      if (department) await updateDepartment(actor, department, input);
      else await createDepartment(actor, id, input, nextOrder);
      toast.success(department ? 'Department updated' : `${input.name} created — now create its admin`);
      onOpenChange(false);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{department ? 'Edit department' : 'New department'}</DialogTitle>
          <DialogDescription>Each department gets exactly one admin, who manages its programs.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Name" htmlFor="dept-name" required>
            <Input id="dept-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="College of Computing and Information Technology" />
          </Field>
          <Field label="Short code" htmlFor="dept-code" required hint={department ? undefined : `ID: ${id || '—'} (cannot be changed later)`}>
            <Input id="dept-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="CCIT" maxLength={12} />
          </Field>
          <Field label="Description" htmlFor="dept-desc">
            <Textarea id="dept-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </Field>
          <Field label="Color">
            <div className="flex flex-wrap gap-2">
              {departmentPalette.map((swatch) => (
                <button
                  type="button"
                  key={swatch}
                  onClick={() => setColor(swatch)}
                  className={cn('size-8 rounded-full ring-offset-2 transition', color === swatch ? 'ring-2 ring-navy-900' : 'hover:scale-110')}
                  style={{ background: swatch }}
                  aria-label={`Color ${swatch}`}
                />
              ))}
            </div>
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!valid} loading={busy}>
              {department ? 'Save changes' : 'Create department'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DepartmentsPage() {
  const actor = useActor();
  const { departments, isLoading, error } = useDepartments();
  const programs = usePrograms(null);
  const [editing, setEditing] = React.useState<Department | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);
  const [archiving, setArchiving] = React.useState<Department | null>(null);

  const programCount = (id: string) => (programs.data ?? []).filter((p) => p.departmentId === id && p.status === 'active').length;

  const toggleArchive = async (dept: Department) => {
    try {
      await setDepartmentStatus(actor, dept, dept.status === 'active' ? 'archived' : 'active');
      toast.success(dept.status === 'active' ? `${dept.name} archived` : `${dept.name} restored`);
    } catch (e) {
      toast.error(errorMessage(e));
    }
    setArchiving(null);
  };

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Departments"
        description="Create each department once. Every department has a single admin slot — only that admin can manage its programs."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus /> New department
          </Button>
        }
      />
      {error && <ErrorState error={error} />}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}</div>
      ) : !departments.length ? (
        <Card>
          <EmptyState icon={Building2} title="No departments yet" description="Create the first department, then give it an admin." />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {departments.map((dept) => (
            <Card key={dept.id} className={cn('group flex flex-col overflow-hidden', dept.status === 'archived' && 'opacity-70')}>
              <div className="h-1.5" style={{ background: dept.color }} />
              <Link to={`/departments/${dept.id}`} className="flex-1 p-5 transition hover:bg-gold-50/50">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-bold tracking-wider text-navy-600">{dept.code}</div>
                    <div className="mt-0.5 font-semibold leading-snug text-navy-900">{dept.name}</div>
                  </div>
                  <StatusBadge status={dept.status} />
                </div>
                <div className="mt-2 text-[13px] text-navy-600">{pluralize(programCount(dept.id), 'active program')}</div>
                <div className="mt-4 rounded-xl border border-dashed p-3">
                  <div className="text-[11px] font-semibold tracking-wider text-navy-400 uppercase">Admin slot</div>
                  {dept.adminUid ? (
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-navy-900">{dept.adminName}</div>
                        <div className="truncate text-xs text-navy-600">{dept.adminEmail}</div>
                      </div>
                      <ChevronRight className="size-4 shrink-0 text-navy-400" />
                    </div>
                  ) : (
                    <div className="mt-1 text-sm font-medium text-rust-600">No admin assigned</div>
                  )}
                </div>
              </Link>
              <div className="flex flex-wrap items-center gap-1 border-t px-3 py-2">
                {!dept.adminUid && dept.status === 'active' && (
                  <Link to={`/admins/new?department=${dept.id}`} className={buttonVariants({ variant: 'gold', size: 'sm' })}>
                    <UserPlus /> Create admin
                  </Link>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto"
                  onClick={() => {
                    setEditing(dept);
                    setFormOpen(true);
                  }}
                >
                  <Pencil /> Edit
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setArchiving(dept)}>
                  {dept.status === 'active' ? <Archive /> : <RotateCcw />}
                  {dept.status === 'active' ? 'Archive' : 'Restore'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <DepartmentForm open={formOpen} onOpenChange={setFormOpen} department={editing} nextOrder={departments.length + 1} />

      <AlertDialog open={Boolean(archiving)} onOpenChange={(open) => !open && setArchiving(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>{archiving?.status === 'active' ? 'Archive' : 'Restore'} {archiving?.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            {archiving?.status === 'active'
              ? archiving.adminUid
                ? 'This department still has an admin. Disable the admin first (Admins page), then archive the department.'
                : 'Its programs stay in the database but students will no longer be matched to them.'
              : 'Students will be matched to its programs again. You can then assign an admin.'}
          </AlertDialogDescription>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {!(archiving?.status === 'active' && archiving.adminUid) && (
              <AlertDialogAction className={buttonVariants({ variant: archiving?.status === 'active' ? 'destructive' : 'default' })} onClick={() => archiving && void toggleArchive(archiving)}>
                {archiving?.status === 'active' ? 'Archive' : 'Restore'}
              </AlertDialogAction>
            )}
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
