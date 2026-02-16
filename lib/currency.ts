
import { XMLParser } from "fast-xml-parser";

interface ExchangeRate {
    currencyCode: string;
    buying: number;
    selling: number;
}

export async function getUsdExchangeRate(): Promise<number> {
    // 1. Try TCMB
    try {
        console.log("Fetching exchange rate from TCMB...");
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        const response = await fetch("https://www.tcmb.gov.tr/kurlar/today.xml", {
            next: { revalidate: 3600 }, // Cache for 1 hour
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36"
            },
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.ok) {
            const xmlText = await response.text();
            const parser = new XMLParser({ ignoreAttributes: false });
            const data = parser.parse(xmlText);

            if (data?.Tarih_Date?.Currency) {
                const usdData = data.Tarih_Date.Currency.find((c: any) => c["@_CurrencyCode"] === "USD" || c.CurrencyName === "US DOLLAR");
                if (usdData) {
                    const rate = parseFloat(usdData.ForexSelling);
                    console.log("Exchange rate fetched from TCMB:", rate);
                    return rate;
                }
            }
        }
        console.warn("TCMB fetch failed or invalid data, trying backup...");
    } catch (error) {
        console.error("TCMB Fetch Error:", error);
    }

    // 2. Try Frankfurter (Backup)
    try {
        console.log("Fetching exchange rate from Frankfurter...");
        const response = await fetch("https://api.frankfurter.app/latest?from=USD&to=TRY", {
            next: { revalidate: 3600 }
        });

        if (response.ok) {
            const data = await response.json();
            if (data?.rates?.TRY) {
                const rate = data.rates.TRY;
                console.log("Exchange rate fetched from Frankfurter:", rate);
                return rate;
            }
        }
    } catch (error) {
        console.error("Frankfurter Fetch Error:", error);
    }

    // 3. Try Open Exchange Rates (open.er-api.com)
    try {
        console.log("Fetching exchange rate from Open ER API...");
        const response = await fetch("https://open.er-api.com/v6/latest/USD", {
            next: { revalidate: 3600 }
        });

        if (response.ok) {
            const data = await response.json();
            if (data?.rates?.TRY) {
                const rate = data.rates.TRY;
                console.log("Exchange rate fetched from Open ER API:", rate);
                return rate;
            }
        }
    } catch (error) {
        console.error("Open ER API Fetch Error:", error);
    }

    // 4. Try Fawaz Ahmed Currency API (via jsdelivr)
    try {
        console.log("Fetching exchange rate from Fawaz Ahmed API...");
        const response = await fetch("https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json", {
            next: { revalidate: 3600 }
        });

        if (response.ok) {
            const data = await response.json();
            if (data?.usd?.try) {
                const rate = data.usd.try;
                console.log("Exchange rate fetched from Fawaz Ahmed API:", rate);
                return rate;
            }
        }
    } catch (error) {
        console.error("Fawaz Ahmed API Fetch Error:", error);
    }

    // 5. Last Resort Fallback (Updated periodically)
    console.error("All payment exchange rate APIs failed. Using hardcoded fallback.");
    return 37.50;
}
