import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { cn } from "../lib/utils";

interface PlaceholderCardProps {
  title: string;
  description: string;
  detail?: ReactNode;
  className?: string;
}

export function PlaceholderCard({ title, description, detail, className }: PlaceholderCardProps) {
  return (
    <Card className={cn("border-dashed bg-white/45 dark:bg-[#17152d]", className)}>
      <CardHeader className="pb-4">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      {detail ? <CardContent className="pt-0 text-sm text-muted-foreground">{detail}</CardContent> : null}
    </Card>
  );
}
