import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Image as ImageIcon } from "lucide-react";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameMonth, isSameDay, addMonths, subMonths,
} from "date-fns";

const platformColors: Record<string, string> = {
  instagram: "bg-pink-100 text-pink-800",
  facebook: "bg-blue-100 text-blue-800",
  linkedin: "bg-sky-100 text-sky-800",
  tiktok: "bg-purple-100 text-purple-800",
};

interface CalendarViewProps {
  posts: any[];
}

export default function CalendarView({ posts }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const navigate = useNavigate();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const postsByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    posts.forEach((post) => {
      if (post.scheduled_at) {
        const key = format(new Date(post.scheduled_at), "yyyy-MM-dd");
        if (!map[key]) map[key] = [];
        map[key].push(post);
      }
    });
    return map;
  }, [posts]);

  const selectedPosts = selectedDate
    ? postsByDate[format(selectedDate, "yyyy-MM-dd")] || []
    : [];

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold text-foreground">
          {format(currentMonth, "MMMM yyyy")}
        </h3>
        <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">
            {d}
          </div>
        ))}

        {/* Calendar cells */}
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayPosts = postsByDate[key] || [];
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={key}
              className={`min-h-[80px] border rounded-md p-1 cursor-pointer transition-colors ${
                !isCurrentMonth ? "bg-muted/30 text-muted-foreground/50" : "bg-card"
              } ${isSelected ? "ring-2 ring-primary" : ""} ${
                isToday ? "border-primary" : "border-border"
              } hover:bg-accent/50`}
              onClick={() => setSelectedDate(day)}
            >
              <span className={`text-xs font-medium ${isToday ? "text-primary font-bold" : ""}`}>
                {format(day, "d")}
              </span>
              <div className="mt-0.5 space-y-0.5">
                {dayPosts.slice(0, 3).map((post: any) => (
                  <div
                    key={post.id}
                    className="text-[10px] leading-tight truncate rounded px-1 py-0.5 bg-primary/10 text-primary cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/approvals/${post.id}`);
                    }}
                  >
                    {post.title}
                  </div>
                ))}
                {dayPosts.length > 3 && (
                  <span className="text-[10px] text-muted-foreground">+{dayPosts.length - 3} more</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected date detail */}
      {selectedDate && (
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-2">
            {format(selectedDate, "EEEE, MMMM d")} — {selectedPosts.length} post{selectedPosts.length !== 1 ? "s" : ""}
          </h4>
          {selectedPosts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No posts scheduled for this day.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {selectedPosts.map((post: any) => (
                <Card
                  key={post.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/approvals/${post.id}`)}
                >
                  <CardContent className="p-3 space-y-2">
                    {post.creative_url ? (
                      <div className="aspect-video bg-muted rounded overflow-hidden">
                        <img src={post.creative_url} alt="" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="aspect-video bg-muted rounded flex items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
                      </div>
                    )}
                    <h4 className="text-sm font-medium text-foreground line-clamp-2">{post.title}</h4>
                    <div className="flex flex-wrap gap-1">
                      {post.platform?.split(",").map((p: string) => (
                        <Badge
                          key={p}
                          variant="secondary"
                          className={`text-[10px] ${platformColors[p.trim().toLowerCase()] || ""}`}
                        >
                          {p.trim()}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
