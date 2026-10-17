import { formatTuition } from '@wisepath/shared';
import { ArrowRight, GraduationCap, Pencil, UserCog, UserPlus } from 'lucide-react';
import * as React from 'react';
import { Link, useParams } from 'react-router';
import { EmptyState, ErrorState, PageHeader, StatCard, StatusBadge, useRowLink } from '@/components/data/display';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, Skeleton, Table, TBody, TD, TH, THead, TR } from '@/components/ui/primitives';
import { useDepartments, usePrograms } from '@/lib/data/catalog';
import { useOverviewStats } from '@/lib/data/results';
import { useNavigate } from 'react-router';
import { DepartmentForm } from './DepartmentsPage';

export function DepartmentDetailPage() {
  const { deptId } = useParams();
  const navigate = useNavigate();
  const rowLink = useRowLink();
  const { byId, isLoading, departments } = useDepartments();
  const dept = deptId ? byId.get(deptId) : undefined;
  const programs = usePrograms(deptId);
  const stats = useOverviewStats(deptId ? [deptId] : []);
  const [editOpen, setEditOpen] = React.useState(false);

  if (isLoading) return <Skeleton className="h-64 rounded-xl" />;
  if (!dept) return <ErrorState error={new Error('Department not found.')} />;

  return (
    <>
      <PageHeader
        eyebrow={dept.code}
        title={dept.name}
        description={dept.description}
        actions={
          <>
            <StatusBadge status={dept.status} />
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil /> Edit
            </Button>
          </>
        }
      />
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center gap-2 text-[13px] font-medium text-navy-600">
            <UserCog className="size-4" /> Department admin
          </div>
          {dept.adminUid ? (
            <Link to={`/admins/${dept.adminUid}`} className="group mt-3 flex items-center justify-between gap-2 rounded-xl bg-surface/70 p-3 transition hover:bg-gold-50">
              <div className="min-w-0">
                <div className="truncate font-semibold text-navy-900">{dept.adminName}</div>
                <div className="truncate text-xs text-navy-600">{dept.adminEmail}</div>
              </div>
              <ArrowRight className="size-4 text-navy-400 transition group-hover:translate-x-0.5" />
            </Link>
          ) : (
            <div className="mt-3 space-y-3">
              <p className="text-sm text-rust-600">This department has no admin. Only an admin can add or edit its programs.</p>
              {dept.status === 'active' && (
                <Button asChild variant="gold" size="sm">
                  <Link to={`/admins/new?department=${dept.id}`}>
                    <UserPlus /> Create admin
                  </Link>
                </Button>
              )}
            </div>
          )}
        </Card>
        <StatCard
          label="Students best-matched here"
          value={stats.data?.departmentCounts[dept.id] ?? 0}
          loading={stats.isLoading}
          tone="teal"
          to={`/results?view=best&department=${dept.id}`}
          hint="Latest result of each student"
        />
        <StatCard
          label="Active programs"
          value={(programs.data ?? []).filter((p) => p.status === 'active').length}
          loading={programs.isLoading}
          icon={GraduationCap}
          tone="gold"
          to={`/programs?department=${dept.id}`}
        />
      </div>

      <Card className="mt-6 overflow-hidden">
        <CardHeader>
          <CardTitle>Programs</CardTitle>
        </CardHeader>
        {programs.error ? (
          <CardContent>
            <ErrorState error={programs.error} />
          </CardContent>
        ) : !programs.data?.length ? (
          <EmptyState title="No programs yet" description="The department admin adds programs from their dashboard." compact />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Program</TH>
                <TH className="hidden md:table-cell">Tuition / term</TH>
                <TH>Status</TH>
              </TR>
            </THead>
            <TBody>
              {programs.data.map((p) => {
                const link = rowLink(() => navigate(`/programs/${p.id}`));
                return (
                  <TR key={p.id} {...link}>
                    <TD>
                      <div className="font-medium text-navy-900">{p.title}</div>
                      <div className="text-xs text-navy-600">{p.code}</div>
                    </TD>
                    <TD className="hidden text-navy-700 md:table-cell">{formatTuition(p.tuitionPerTerm)}</TD>
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
      <DepartmentForm open={editOpen} onOpenChange={setEditOpen} department={dept} nextOrder={departments.length + 1} />
    </>
  );
}
