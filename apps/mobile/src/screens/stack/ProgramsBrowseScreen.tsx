import { Search } from 'lucide-react-native';
import * as React from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { ProgramRow } from '../../components/cards';
import { Chip, EmptyState, Header, Screen, T } from '../../components/ui';
import { useCatalogView, useLatestResult } from '../../hooks/useStudentData';
import type { AppScreen } from '../../navigation/types';
import { colors, fonts, radius, space } from '../../theme';

export function ProgramsBrowseScreen({ route }: AppScreen<'ProgramsBrowse'>) {
  const catalog = useCatalogView();
  const latest = useLatestResult();
  const [dept, setDept] = React.useState<string | null>(route.params?.departmentId ?? null);
  const [search, setSearch] = React.useState('');
  const term = search.trim().toLowerCase();
  const matchById = new Map((latest.data?.rankings ?? []).map((r) => [r.programId, r.matchPercent]));
  const programs = catalog.programs.filter(
    (p) => (!dept || p.departmentId === dept) && (!term || p.title.toLowerCase().includes(term) || p.code.toLowerCase().includes(term)),
  );

  return (
    <Screen header={<Header title="Programs" subtitle={`${catalog.programs.length} programs in ${catalog.departments.length} departments`} />}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.lineStrong, paddingHorizontal: space.md }}>
        <Search size={18} color={colors.navy400} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search programs"
          placeholderTextColor={colors.navy400}
          style={{ flex: 1, minHeight: 46, fontFamily: fonts.regular, fontSize: 15, color: colors.text }}
        />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: space.md, marginHorizontal: -space.xl }} contentContainerStyle={{ gap: 8, paddingHorizontal: space.xl }}>
        <Chip label="All" selected={!dept} onPress={() => setDept(null)} small />
        {catalog.departments.map((d) => (
          <Chip key={d.id} label={d.code} selected={dept === d.id} onPress={() => setDept(d.id)} small />
        ))}
      </ScrollView>
      {dept && (
        <T variant="bodySm" color={colors.textMuted} style={{ marginTop: space.md }}>
          {catalog.deptById.get(dept)?.name}
        </T>
      )}
      <View style={{ gap: space.md, marginTop: space.lg }}>
        {programs.map((p) => (
          <ProgramRow key={p.id} program={p} dept={catalog.deptById.get(p.departmentId)} match={matchById.get(p.id)} />
        ))}
        {!programs.length && <EmptyState title="No programs found" body="Try another department or search." />}
      </View>
    </Screen>
  );
}
