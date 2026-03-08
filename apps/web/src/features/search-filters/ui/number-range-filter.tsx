import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

interface NumberRangeFilterProps {
  label: string;
  gteValue?: number;
  lteValue?: number;
  onGteChange: (value?: number) => void;
  onLteChange: (value?: number) => void;
}

export const NumberRangeFilter = ({
  label,
  gteValue,
  lteValue,
  onGteChange,
  onLteChange,
}: NumberRangeFilterProps) => (
  <div>
    <Label className="text-xs font-medium">{label}</Label>
    <div className="mt-1 flex items-center gap-1.5">
      <Input
        type="number"
        placeholder="最小"
        value={gteValue ?? ""}
        onChange={(event) => {
          onGteChange(event.target.value === "" ? undefined : Number(event.target.value));
        }}
        className="h-8 w-0 min-w-0 flex-1 text-xs"
      />
      <span className="shrink-0 text-xs text-muted-foreground">〜</span>
      <Input
        type="number"
        placeholder="最大"
        value={lteValue ?? ""}
        onChange={(event) => {
          onLteChange(event.target.value === "" ? undefined : Number(event.target.value));
        }}
        className="h-8 w-0 min-w-0 flex-1 text-xs"
      />
    </div>
  </div>
);
