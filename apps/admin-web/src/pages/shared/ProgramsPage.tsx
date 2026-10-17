import { formatTuition, type Program } from '@wisepath/shared';
import { GraduationCap, Lock, Plus } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useAuth } from '@/auth/AuthProvider';
import { DeptDot, EmptyState, ErrorState, ListSkeleton, PageHeader, StatusBadge, useRowLink } from '@/components/data/display';
import { Button } from '@/components/ui/button';
import { Card, NativeSelect, Table, TBody, TD, TH, THead, TR } from '@/components/ui/primitives';
import { useDepartments, usePrograms } from '@/lib/data/catalog';

export const canEditProgram = (role: string | null, departmentId: string | null | undefined, program: Pick<Program, 'departmentId'>) =>
  role === 'admin' && Boolean(departmentId) && program.departmentId === departmentId;

export function ProgramsPage() {
  const { isSuperAdmin, actor, department, role } = useAuth();
  const navigate = useNavigate();
  const rowLink = useRowLink();
  const [params, setParams] = useSearchParams();
  const { departments, byId } = useDepartments();
  const showAll = isSuperAdmin || params.get('scope') === 'all';
  const filterDept = isSuperAdmin ? params.get('department') : showAll ? params.get('department') : actor?.departmentId ?? null;
  const { data, isLoading, error } = usePrograms(filterDept);
  const programs = data ?? [];

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  return (
    <>
      <PageHeader
        eyebrow={isSuperAdmin ? 'Catalog' : department?.name}
        title="Programs"
        description={
          isSuperAdmin
            ? 'Every degree program, grouped by department. Programs are managed by their department’s admin; you can view them all.'
            : 'Your department’s degree programs. Only you can add, edit, archive or delete them.'
        }
        actions={
          role === 'admin' && (
            <Button asChild>
              <Link to="/programs/new">
                <Plus /> New program
              </Link>
            </Button>
          )
        }
      />
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center">
          {!isSuperAdmin && (
            <div className="inline-flex rounded-lg border bg-white p-1 text-[13px]">
              <button
                onClick={() => setParam('scope', null)}
                className={`rounded-md px-3 py-1.5 font-medium ${!showAll ? 'bg-navy-900 text-white' : 'text-navy-600'}`}
              >
                My department
              </button>
              <button
                onClick={() => setParam('scope', 'all')}
                className={`rounded-md px-3 py-1.5 font-medium ${showAll ? 'bg-navy-900 text-white' : 'text-navy-600'}`}
              >
                All departments
              </button>
            </div>
          )}
          {showAll && (
            <div className="sm:w-80">
              <NativeSelect value={params.get('department') ?? ''} onChange={(e) => setParam('department', e.target.value || null)} aria-label="Department">
                <option value="">All departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.code} — {d.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
          )}
          <div className="text-[13px] text-navy-600 sm:ml-auto">{programs.length} programs</div>
        </div>
        {error ? (
          <div className="p-5"><ErrorState error={error} /></div>
        ) : isLoading ? (
          <ListSkeleton rows={8} />
        ) : !programs.length ? (
          <EmptyState
            icon={GraduationCap}
            title="No programs here yet"
            action={
              role === 'admin' && !showAll ? (
                <Button asChild size="sm">
                  <Link to="/programs/new">
                    <Plus /> Add your first program
                  </Link>
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Program</TH>
                {showAll && <TH className="hidden md:table-cell">Department</TH>}
                <TH className="hidden lg:table-cell">Tuition / term</TH>
                <TH className="hidden sm:table-cell">Subjects</TH>
                <TH>Status</TH>
              </TR>
            </THead>
            <TBody>
              {programs.map((p) => {
                const dept = byId.get(p.departmentId);
                const editable = canEditProgram(role, actor?.departmentId, p);
                const link = rowLink(() => navigate(`/programs/${p.id}`));
                return (
                  <TR key={p.id} {...link}>
                    <TD>
                      <div className="flex items-center gap-2 font-medium text-navy-900">
                        {p.title}
                        {!editable && !isSuperAdmin && <Lock className="size-3.5 text-navy-400" aria-label="Read-only" />}
                      </div>
                      <div className="text-xs text-navy-600">
                        {p.code} · {p.durationYears} years · {p.difficulty}
                      </div>
                    </TD>
                    {showAll && (
                      <TD className="hidden md:table-cell">
                        <div className="flex items-center gap-2 text-[13px]">
                          <DeptDot color={dept?.color} /> {dept?.code}
                        </div>
                      </TD>
                    )}
                    <TD className="hidden text-navy-700 lg:table-cell">{formatTuition(p.tuitionPerTerm)}</TD>
                    <TD className="hidden text-navy-700 sm:table-cell">{p.curriculum.reduce((n, t) => n + t.subjects.length, 0)}</TD>
                    <TD>
                      <StatusBadge status={p.status} />
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </Card>
    </>
  );
}
