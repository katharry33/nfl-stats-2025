import { Card, CardContent } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="space-y-2">
        <div className="h-8 w-48 bg-slate-200 animate-pulse rounded"></div>
        <div className="h-4 w-64 bg-slate-200 animate-pulse rounded"></div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="h-4 w-20 bg-slate-200 animate-pulse rounded mb-2"></div>
              <div className="h-8 w-24 bg-slate-200 animate-pulse rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
          <p className="text-center mt-4 text-slate-500">Loading bets...</p>
        </CardContent>
      </Card>
    </div>
  );
}