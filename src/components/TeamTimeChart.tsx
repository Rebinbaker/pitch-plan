import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TimeEntry } from '@/types/timeTracking';
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { sv } from 'date-fns/locale';

interface TeamTimeChartProps {
  timeEntries: TimeEntry[];
}

const TeamTimeChart: React.FC<TeamTimeChartProps> = ({ timeEntries }) => {
  // Prepare weekly data
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const weeklyData = weekDays.map(day => {
    const dayString = format(day, 'yyyy-MM-dd');
    const dayEntries = timeEntries.filter(entry => 
      format(new Date(entry.start_time), 'yyyy-MM-dd') === dayString
    );
    
    const totalHours = dayEntries.reduce((sum, entry) => sum + (entry.duration_hours || 0), 0);
    const billableHours = dayEntries
      .filter(entry => entry.is_billable)
      .reduce((sum, entry) => sum + (entry.duration_hours || 0), 0);

    return {
      day: format(day, 'EEEE', { locale: sv }),
      date: dayString,
      totalHours: Math.round(totalHours * 100) / 100,
      billableHours: Math.round(billableHours * 100) / 100,
      entries: dayEntries.length
    };
  });

  // Prepare monthly trend data (last 30 days)
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    return date;
  });

  const trendData = last30Days.map(day => {
    const dayString = format(day, 'yyyy-MM-dd');
    const dayEntries = timeEntries.filter(entry => 
      format(new Date(entry.start_time), 'yyyy-MM-dd') === dayString
    );
    
    const totalHours = dayEntries.reduce((sum, entry) => sum + (entry.duration_hours || 0), 0);

    return {
      date: format(day, 'MMM dd', { locale: sv }),
      hours: Math.round(totalHours * 100) / 100
    };
  });

  // Calculate statistics
  const thisWeekTotal = weeklyData.reduce((sum, day) => sum + day.totalHours, 0);
  const thisWeekBillable = weeklyData.reduce((sum, day) => sum + day.billableHours, 0);
  const averageDaily = thisWeekTotal / 7;
  const billablePercentage = thisWeekTotal > 0 ? (thisWeekBillable / thisWeekTotal) * 100 : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Weekly Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Denna vecka</CardTitle>
          <CardDescription>
            Timmar per dag - Totalt: {Math.round(thisWeekTotal * 100) / 100}t | 
            Snitt: {Math.round(averageDaily * 100) / 100}t/dag | 
            Fakturerbart: {Math.round(billablePercentage)}%
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  `${value}t`, 
                  name === 'totalHours' ? 'Totalt' : 'Fakturerbart'
                ]}
                labelFormatter={(label) => `${label}`}
              />
              <Bar dataKey="totalHours" fill="hsl(var(--primary))" name="totalHours" />
              <Bar dataKey="billableHours" fill="hsl(var(--primary) / 0.6)" name="billableHours" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 30-Day Trend */}
      <Card>
        <CardHeader>
          <CardTitle>30-dagars trend</CardTitle>
          <CardDescription>Utveckling av arbetstid över tid</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip 
                formatter={(value: number) => [`${value}t`, 'Timmar']}
                labelFormatter={(label) => `${label}`}
              />
              <Line 
                type="monotone" 
                dataKey="hours" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default TeamTimeChart;