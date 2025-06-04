import { createClient } from "npm:@supabase/supabase-js@2.39.1";
import yahooFinance from "npm:yahoo-finance2@2.9.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const symbol = url.searchParams.get("symbol");

    if (!symbol) {
      return new Response(
        JSON.stringify({ error: "Symbol parameter is required" }),
        { 
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Add .NS suffix for NSE stocks
    const yahooSymbol = symbol + ".NS";

    // Format dates as YYYY-MM-DD strings
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 100 * 24 * 60 * 60 * 1000);
    
    const formatDate = (date) => {
      return date.toISOString().split('T')[0];
    };

    // Fetch historical data with properly formatted dates
    const result = await yahooFinance.historical(yahooSymbol, {
      period1: formatDate(startDate),
      period2: formatDate(endDate),
      interval: "1d"
    });

    const formattedData = result.map(quote => ({
      date: quote.date.toISOString().split('T')[0],
      open: quote.open,
      high: quote.high,
      low: quote.low,
      close: quote.close,
      volume: quote.volume
    }));

    return new Response(
      JSON.stringify(formattedData),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    // Enhanced error logging
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      cause: error.cause
    });

    return new Response(
      JSON.stringify({ 
        error: "Failed to fetch stock data",
        details: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});