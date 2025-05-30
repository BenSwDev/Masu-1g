"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { useQuery } from "@tanstack/react-query"
import { WeeklyHoursSection } from "./weekly-hours-section"
import { SpecialDatesSection } from "./special-dates-section"

interface WorkingHours {
  weeklyHours: {
    [day: string]: {
      open: string
      close: string
    }
  }
  specialDates: {
    [date: string]: {
      open: string
      close: string
    }
  }
}

const getWorkingHours = async (): Promise<WorkingHours> => {
  // Replace with your actual API endpoint
  const res = await fetch("/api/working-hours")
  return res.json()
}

export const WorkingHoursClient = () => {
  const { toast } = useToast()
  const { data: workingHours, refetch } = useQuery({
    queryKey: ["workingHours"],
    queryFn: getWorkingHours,
  })

  if (!workingHours) {
    return <div>Loading...</div>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Working Hours</CardTitle>
        <CardDescription>Manage your store's working hours here.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="weekly" className="w-full">
          <TabsList>
            <TabsTrigger value="weekly">Weekly Hours</TabsTrigger>
            <TabsTrigger value="special">Special Dates</TabsTrigger>
          </TabsList>
          <TabsContent value="weekly">
            <WeeklyHoursSection weeklyHours={workingHours.weeklyHours} onRefresh={refetch} />
          </TabsContent>
          <TabsContent value="special">
            <SpecialDatesSection
              specialDates={workingHours.specialDates}
              weeklyHours={workingHours.weeklyHours}
              onRefresh={refetch}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
