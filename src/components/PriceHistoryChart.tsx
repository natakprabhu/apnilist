import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

interface PriceData {
  created_at: string;
  amazon_price: number | null;
  flipkart_price: number | null;
}

interface PriceHistoryChartProps {
  data: PriceData[];
  days?: 7 | 15 | 30 | 60 | 90;
}

const PriceHistoryChart = ({ data, days = 30 }: PriceHistoryChartProps) => {
  const chartData = data.map(item => ({
    date: format(new Date(item.created_at), 'MMM dd'),
    Amazon: item.amazon_price,
    Flipkart: item.flipkart_price,
  }));

  return (
    <div className="w-full h-[300px] mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis 
            dataKey="date" 
            className="text-xs"
            stroke="hsl(var(--muted-foreground))"
          />
          <YAxis 
            className="text-xs"
            stroke="hsl(var(--muted-foreground))"
            tickFormatter={(value) => `₹${value}`}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
            }}
            formatter={(value: number) => [`₹${value}`, '']}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="Amazon" 
            stroke="hsl(var(--primary))" 
            strokeWidth={2}
            dot={{ fill: 'hsl(var(--primary))' }}
          />
          <Line 
            type="monotone" 
            dataKey="Flipkart" 
            stroke="hsl(var(--accent))" 
            strokeWidth={2}
            dot={{ fill: 'hsl(var(--accent))' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PriceHistoryChart;