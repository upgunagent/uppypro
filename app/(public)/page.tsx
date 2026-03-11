import { LandingHeader, LandingFooter } from "@/components/landing/layout";
import { HeroSection } from "@/components/landing/hero";
import { FeaturesSection, PricingSection, HowItWorks, ContactSection } from "@/components/landing/sections";
import { MobileAccessSection } from "@/components/landing/mobile-access";
import { SolutionsSection } from "@/components/landing/solutions";
import { FaqSection } from "@/components/landing/faq";
import { getProductPrices } from "@/app/actions/pricing";
export const dynamic = 'force-dynamic';

export default async function LandingPage() {
    const prices = await getProductPrices();

    const inboxPrice = prices?.uppypro_inbox || prices?.base_inbox || prices?.inbox || 895;
    const aiPrice = prices?.ai || prices?.uppypro_ai || 4794;

    return (
        <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-orange-100 selection:text-orange-900">
            <LandingHeader />
            <main>
                <HeroSection />
                <HowItWorks />
                <FeaturesSection />
                <MobileAccessSection />
                <PricingSection inboxPrice={inboxPrice} aiPrice={aiPrice} />

                <FaqSection />

                <SolutionsSection />

                <ContactSection />
            </main>
            <LandingFooter />
        </div>
    );
}
