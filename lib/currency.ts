
import { XMLParser } from "fast-xml-parser";

interface ExchangeRate {
    currencyCode: string;
    buying: number;
    selling: number;
}

export async function getUsdExchangeRate(): Promise<number> {

    // 1. Try finans.truncgil.com (TCMB Mirror - High Availability & JSON)
    try {
        console.log("Fetching exchange rate from TCMB Mirror (Truncgil)...");
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout for mirror

        const response = await fetch("https://finans.truncgil.com/today.json", {
            cache: 'no-store', // Disable caching to ensure fresh rate
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            },
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.ok) {
            const data = await response.json();
            // Data format: { "USD": { "Alış": "36.1234", "Satış": "36.5678", ... } }
            if (data?.USD?.Satış) {
                const rate = parseFloat(data.USD.Satış.replace(',', '.')); // Ensure dot decimal
                console.log("Exchange rate fetched from TCMB Mirror:", rate);
                if (!isNaN(rate) && rate > 0) return rate;
            }
        }
    } catch (error) {
        console.error("TCMB Mirror Fetch Error:", error);
    }

    // 2. Try Official TCMB (Original Source)
    try {
        console.log("Fetching exchange rate from TCMB Official...");
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch("https://www.tcmb.gov.tr/kurlar/today.xml", {
            cache: 'no-store', // Disable caching
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
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
                    console.log("Exchange rate fetched from TCMB Official:", rate);
                    return rate;
                }
            }
        }
    } catch (error) {
        console.error("TCMB Official Fetch Error:", error);
    }

    // 3. Try Frankfurter (Backup)
    try {
        console.log("Fetching from Frankfurter...");
        const response = await fetch("https://api.frankfurter.app/latest?from=USD&to=TRY", {
            cache: 'no-store'
        });

        if (response.ok) {
            const data = await response.json();
            if (data?.rates?.TRY) {
                return data.rates.TRY;
            }
        }
    } catch (error) {
        console.error("Frankfurter Fetch Error:", error);
    }

    // 4. Try Open Exchange Rates (open.er-api.com)
    try {
        console.log("Fetching from Open ER API...");
        const response = await fetch("https://open.er-api.com/v6/latest/USD", {
            cache: 'no-store'
        });

        if (response.ok) {
            const data = await response.json();
            if (data?.rates?.TRY) {
                return data.rates.TRY;
            }
        }
    } catch (error) {
        console.error("Open ER API Fetch Error:", error);
    }

    // 5. Last Resort Fallback
    console.error("All exchange rate APIs failed. Using hardcoded fallback.");
    return 36.50; // Updated to more realistic current rate
}
