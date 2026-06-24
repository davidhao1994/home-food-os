type PageHeaderProps = {
  title: string;
  subtitle?: string;
};

export function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <header className="mb-6 space-y-1">
      <h1 className="text-2xl font-semibold md:text-3xl">{title}</h1>
      {subtitle ? <p className="text-sm text-muted-foreground md:text-base">{subtitle}</p> : null}
    </header>
  );
}
