import { Loader2 } from "lucide-react"

export default function DashboardLoading() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[50vh]">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground">Loading dashboard...</p>
      </div>
    </div>
  )
}
