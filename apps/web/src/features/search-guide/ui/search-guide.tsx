import { Search } from "lucide-react";
import Link from "next/link";

import { parseQueryInput } from "@/shared/lib";

interface GuideItem {
  feature: string;
  description: string;
  examples: { query: string; label: string }[];
}

const basicGuide: GuideItem[] = [
  {
    feature: "キーワード検索",
    description: "タイトル・説明文・タグに含まれる語句で動画を検索します",
    examples: [{ query: "初音ミク ボカロ", label: "両方を含む動画を検索" }],
  },
  {
    feature: "OR検索",
    description: "( )で囲んでORで区切ると、いずれかを含む動画を検索します",
    examples: [
      {
        query: "ミク (歌ってみた OR 踊ってみた)",
        label: "ミク + どちらかを含む動画",
      },
    ],
  },
  {
    feature: "除外検索",
    description: "-をつけた語句を含む動画を結果から除外します",
    examples: [{ query: "ゲーム実況 -マイクラ", label: "マイクラを除外して検索" }],
  },
  {
    feature: "タグ検索",
    description: "#をつけるとタグの完全一致で検索します",
    examples: [{ query: "#VOCALOID 初音ミク", label: "VOCALOIDタグ + キーワード" }],
  },
  {
    feature: "検索対象の指定",
    description: "title: や body: をつけると検索対象をタイトルや説明文に絞り込めます",
    examples: [
      { query: "title:初音ミク", label: "タイトルのみで検索" },
      { query: "body:歌ってみた", label: "説明文のみで検索" },
    ],
  },
];

const advancedGuide: GuideItem[] = [
  {
    feature: "組み合わせ検索",
    description: "OR・除外・タグなどを自由に組み合わせて絞り込めます",
    examples: [
      {
        query: "#ゲーム実況 (マイクラ OR フォートナイト) -荒らし",
        label: "タグ + OR + 除外を組み合わせ",
      },
      {
        query: "(歌ってみた OR 弾いてみた) -初心者",
        label: "OR + 除外の組み合わせ",
      },
      {
        query: "title:初音ミク #VOCALOID",
        label: "タイトル検索 + タグ絞り込み",
      },
    ],
  },
];

interface Limitation {
  description: string;
  bad: string;
  reason: string;
}

const limitations: Limitation[] = [
  {
    description: "ORを複数並べる",
    bad: "(A OR B) (C OR D)",
    reason: "OR検索は1クエリにつき1グループのみ使えます",
  },
  {
    description: "ORの入れ子",
    bad: "((A OR B) OR (C OR D))",
    reason: "括弧のネストには対応していません",
  },
];

const DEFAULT_TARGETS = "title,description,tags";

const searchUrl = (query: string): string => {
  const parsed = parseQueryInput(query);
  // oxlint-disable-next-line id-length -- `q` is the standard URL search parameter name
  const params = new URLSearchParams({ q: parsed.query });
  if (parsed.targets !== DEFAULT_TARGETS) {
    params.set("targets", parsed.targets);
  }
  for (const tag of parsed.tags) {
    params.append("tag", tag);
  }
  return `/search?${params.toString()}`;
};

const GuideSection = ({ items }: { items: GuideItem[] }) => (
  <div className="space-y-4">
    {items.map((item) => (
      <div key={item.feature} className="space-y-1.5">
        <div>
          <h3 className="text-sm font-semibold">{item.feature}</h3>
          <p className="text-sm text-muted-foreground">{item.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {item.examples.map((ex) => (
            <Link
              key={ex.query}
              href={searchUrl(ex.query)}
              className="group inline-flex items-center gap-2 rounded-lg border bg-background px-3 py-1.5 font-mono text-sm transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
            >
              <Search className="size-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
              <span>{ex.query}</span>
              <span className="font-sans text-xs text-muted-foreground transition-colors group-hover:text-primary/60">
                {ex.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    ))}
  </div>
);

const LimitationSection = () => (
  <div className="space-y-3">
    <h3 className="text-sm font-semibold text-muted-foreground">できないこと</h3>
    <div className="space-y-2">
      {limitations.map((item) => (
        <div key={item.bad} className="space-y-0.5">
          <p className="text-sm">
            <span className="font-medium">{item.description}</span>
            <code className="ml-2 rounded border bg-muted px-1.5 py-0.5 font-mono text-xs line-through decoration-destructive/50">
              {item.bad}
            </code>
          </p>
          <p className="text-xs text-muted-foreground">{item.reason}</p>
        </div>
      ))}
    </div>
  </div>
);

export const SearchGuide = () => (
  <div className="w-full rounded-xl border bg-card px-6 py-5">
    <div className="space-y-6">
      <GuideSection items={basicGuide} />
      <div className="border-t pt-4">
        <GuideSection items={advancedGuide} />
      </div>
      <div className="border-t pt-4">
        <LimitationSection />
      </div>
    </div>
  </div>
);
