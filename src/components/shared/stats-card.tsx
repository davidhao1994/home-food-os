import Link from "next/link";
import type { Route } from "next";
import { ChevronRight } from "lucide-react";
import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatsCardProps = {
  title: string;
  value: string | number;
  icon?: ReactNode;
  helper?: string;
  href?: string;
  ariaLabel?: string;
};

export function StatsCard({ title, value, icon, helper, href, ariaLabel }: StatsCardProps) {
  const content = (
    <Card className={cn(href && "h-full transition duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md active:translate-y-0 active:scale-[0.99]")}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          <p className="text-2xl font-semibold">{value}</p>
          <div className="flex items-center gap-2">
            {icon}
            {href ? <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" /> : null}
          </div>
        </div>
        {helper ? <p className="mt-1 text-xs text-muted-foreground">{helper}</p> : null}
      </CardContent>
    </Card>
  );

  if (!href) {
    return content;
  }

  return (
    <Link
      href={href as Route}
      aria-label={ariaLabel ?? `Open ${title}`}
      className="block h-full cursor-pointer rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {content}
    </Link>
  );
}
