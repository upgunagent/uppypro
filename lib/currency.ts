
import { XMLParser } from "fast-xml-parser";

interface ExchangeRate {
    currencyCode: string;
    buying: number;
    selling: number;
}

export async function getUsdExchangeRate(): Promise<number> {
    try {
        console.log("Fetching exchange rate from TCMB...");
        const response = await fetch("https://www.tcmb.gov.tr/kurlar/today.xml", {
            next: { revalidate: 3600 }, // Cache for 1 hour
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36"
            }
        });

        if (!response.ok) {
            console.error(`TCMB API Error: ${response.status} ${response.statusText}`);
            throw new Error(`TCMB API Error: ${response.statusText}`);
        }

        const xmlText = await response.text();
        const parser = new XMLParser({ ignoreAttributes: false });
        const data = parser.parse(xmlText);

        // Handle potential XML structure variations or empty responses
        if (!data || !data.Tarih_Date || !data.Tarih_Date.Currency) {
            console.error("Invalid XML structure received from TCMB", xmlText.substring(0, 100)); // Log first 100 chars
            throw new Error("Invalid XML structure");
        }

        const usdData = data.Tarih_Date.Currency.find((c: any) => c["@_CurrencyCode"] === "USD" || c.CurrencyName === "US DOLLAR");

        if (!usdData) {
            console.error("USD data not found in XML");
            throw new Error("USD currency data not found");
        }

        const rate = parseFloat(usdData.ForexSelling);
        console.log("Exchange rate fetched successfully:", rate);
        return rate;

    } catch (error) {
        console.error("Exchange Rate Fetch Error Details:", error);
        // Fallback to a hardcoded recent approximate rate if API fails
        // This ensures the app doesn't crash or show 0 price
        return 37.50;
    }
}
