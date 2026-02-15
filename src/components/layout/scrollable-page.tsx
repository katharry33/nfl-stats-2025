import { ScrollArea } from "@/components/ui/scroll-area";
import { ReactNode } from "react";

type ScrollablePageProps = {
  header: ReactNode;
  children: ReactNode;
};

export function ScrollablePage({ header, children }: ScrollablePageProps) {
  return (
    <div className="flex h-[calc(100vh_-_84px)] flex-col gap-6">
      {header}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          {children}
        </ScrollArea>
      </div>
    </div>
  );
}
