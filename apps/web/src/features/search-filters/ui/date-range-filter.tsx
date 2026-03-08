import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

const DATE_SPLIT_INDEX = 0;
const DATE_SPLIT_SEPARATOR = "T";
const DATE_START_SUFFIX = "T00:00:00+09:00";
const DATE_END_SUFFIX = "T23:59:59+09:00";

interface DateRangeFilterProps {
  label: string;
  gteValue?: string;
  lteValue?: string;
  onGteChange: (value?: string) => void;
  onLteChange: (value?: string) => void;
}

const extractDatePart = (value: string | undefined): string => {
  if (value === undefined || value === "") {
    return "";
  }
  return value.split(DATE_SPLIT_SEPARATOR)[DATE_SPLIT_INDEX] ?? "";
};

export const DateRangeFilter = ({
  label,
  gteValue,
  lteValue,
  onGteChange,
  onLteChange,
}: DateRangeFilterProps) => (
  <div>
    <Label className="text-xs font-medium">{label}</Label>
    <div className="mt-1 flex flex-col gap-1.5 sm:flex-row sm:items-center">
      <Input
        type="date"
        value={extractDatePart(gteValue)}
        onChange={(event) => {
          onGteChange(
            event.target.value === "" ? undefined : `${event.target.value}${DATE_START_SUFFIX}`,
          );
        }}
        className="h-8 min-w-0 text-xs sm:w-0 sm:flex-1"
      />
      <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">〜</span>
      <Input
        type="date"
        value={extractDatePart(lteValue)}
        onChange={(event) => {
          onLteChange(
            event.target.value === "" ? undefined : `${event.target.value}${DATE_END_SUFFIX}`,
          );
        }}
        className="h-8 min-w-0 text-xs sm:w-0 sm:flex-1"
      />
    </div>
  </div>
);
