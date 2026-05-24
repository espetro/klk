import { $viewMode, useViewMode, type ViewMode } from '@/features';
import { SegmentedControl } from '@expo/ui/community/segmented-control';

export function ViewModeToggle() {
  const viewMode = useViewMode();
  return (
    <SegmentedControl
      values={['List', 'Map']}
      selectedIndex={viewMode === 'list' ? 0 : 1}
      onChange={(e) => {
        const mode: ViewMode = e.nativeEvent.selectedSegmentIndex === 0 ? 'list' : 'map';
        $viewMode.set(mode);
      }}
    />
  );
}
