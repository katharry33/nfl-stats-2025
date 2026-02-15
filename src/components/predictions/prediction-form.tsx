'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Wand2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface GenerateBetPredictionsOutput {
  success: boolean;
  error?: string;
  predictedOutcome?: string;
  confidenceLevel?: number | string;
  reasoning?: string;
}

const initialState: {
    success: boolean;
    data: GenerateBetPredictionsOutput | null;
    error: string | null;
} = {
  success: false,
  data: null,
  error: null,
};

function SubmitButton({ pending }: { pending: boolean }) {
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
      Generate Prediction
    </Button>
  );
}

export function PredictionForm({ action }: { action: (prevState: typeof initialState, formData: FormData) => Promise<typeof initialState> }) {
  const [state, setState] = useState(initialState);
  const [pending, setPending] = useState(false);
  const [date, setDate] = useState<Date | undefined>(new Date());

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    const formData = new FormData(event.currentTarget);
    const result = await action(state, formData);
    setState(result);
    setPending(false);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>Game Details</CardTitle>
            <CardDescription>Enter the details of the game you want to predict.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div className="space-y-2">
                <Label htmlFor="team1">Team 1</Label>
                <Input id="team1" name="team1" placeholder="e.g., Green Bay Packers" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="team2">Team 2</Label>
                <Input id="team2" name="team2" placeholder="e.g., Chicago Bears" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Game Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <Input type="hidden" name="date" value={date ? format(date, "yyyy-MM-dd") : ""} />
            </div>
          </CardContent>
          <CardFooter>
            <SubmitButton pending={pending} />
          </CardFooter>
        </form>
      </Card>
      
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle>AI Prediction</CardTitle>
          <CardDescription>The generated prediction will appear here.</CardDescription>
        </CardHeader>
        <CardContent className="flex-grow flex items-center justify-center">
          {state.success && state.data ? (
            <div className="space-y-4 text-sm">
              <div>
                <h3 className="font-semibold text-base">Outcome</h3>
                <p className="text-muted-foreground">{state.data.predictedOutcome}</p>
              </div>
              <div>
                <h3 className="font-semibold text-base">Confidence</h3>
                <p className="text-muted-foreground">{state.data.confidenceLevel}</p>
              </div>
              <div>
                <h3 className="font-semibold text-base">Reasoning</h3>
                <p className="text-muted-foreground">{state.data.reasoning}</p>

              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground">
              <Wand2 className="mx-auto h-12 w-12" />
              <p>Your prediction is waiting.</p>
            </div>
          )}
          {state.error && <p className="text-destructive">{state.error}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
