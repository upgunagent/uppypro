"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { LandingHeader, LandingFooter } from "@/components/landing/layout";
import { FreeTrialModal } from "@/components/landing/free-trial-modal";
import { Calendar, Clock, ArrowLeft, ArrowRight, Sparkles } from "lucide-react";

interface BlogData {
    title: string; date: string; readTime: string; category: string; image?: string;
    sections: { heading: string; content: string }[];
    uppyProTip: { title: string; text: string };
}

export function BlogPostContent({ blog, slug }: { blog: BlogData; slug: string }) {
    const [freeTrialOpen, setFreeTrialOpen] = useState(false);

    return (
        <>
            <div className="min-h-screen bg-white font-sans text-slate-900">
                <LandingHeader />
                <main>
                    {/* Hero — Image Left, Title Right */}
                    <section className="bg-slate-900 text-white py-12 md:py-20">
                        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                            <Link href="/blog" className="inline-flex items-center gap-2 text-slate-400 hover:text-orange-400 transition-colors mb-8 text-sm">
                                <ArrowLeft className="w-4 h-4" /> Tüm Yazılar
                            </Link>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
                                {/* Left — Image */}
                                <div className="aspect-square rounded-2xl overflow-hidden relative border border-white/10 shadow-2xl">
                                    {blog.image ? (
                                        <Image
                                            src={blog.image}
                                            alt={blog.title}
                                            fill
                                            className="object-cover"
                                            sizes="(max-width: 768px) 100vw, 50vw"
                                            priority
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center">
                                            <Sparkles className="w-12 h-12 text-orange-500/40" />
                                        </div>
                                    )}
                                </div>
                                {/* Right — Title & Meta */}
                                <div>
                                    <div className="flex items-center gap-4 text-sm text-slate-400 mb-4">
                                        <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {blog.date}</span>
                                        <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {blog.readTime} okuma</span>
                                    </div>
                                    <span className="inline-block px-3 py-1 bg-orange-500/20 text-orange-400 text-xs font-bold rounded-full mb-4 border border-orange-500/30">{blog.category}</span>
                                    <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold leading-tight">{blog.title}</h1>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Article Content */}
                    <article className="py-12 md:py-16">
                        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                            {blog.sections.map((section, i) => (
                                <div key={i} className="mb-12">
                                    <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">{section.heading}</h2>
                                    <div className="prose prose-slate max-w-none">
                                        {section.content.split("\n\n").map((paragraph, j) => {
                                            // Check if paragraph is a list
                                            if (paragraph.includes("\n•") || paragraph.startsWith("•")) {
                                                const lines = paragraph.split("\n");
                                                const intro = lines[0].startsWith("•") ? null : lines[0];
                                                const items = lines.filter(l => l.startsWith("•"));
                                                return (
                                                    <div key={j} className="mb-4">
                                                        {intro && <p className="text-slate-700 leading-relaxed mb-2">{intro}</p>}
                                                        <ul className="space-y-2 ml-1">
                                                            {items.map((item, k) => (
                                                                <li key={k} className="flex items-start gap-2 text-slate-600">
                                                                    <span className="text-orange-500 mt-1 text-sm">●</span>
                                                                    <span className="leading-relaxed">{item.replace("• ", "")}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                );
                                            }
                                            return (
                                                <p key={j} className="text-slate-700 leading-relaxed mb-4">{paragraph}</p>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}

                            {/* UppyPro Recommendation */}
                            <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-8 border border-orange-200 mt-12">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <Sparkles className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900 mb-2">{blog.uppyProTip.title}</h3>
                                        <p className="text-slate-600 leading-relaxed mb-4">{blog.uppyProTip.text}</p>
                                        <div className="flex flex-col sm:flex-row gap-3">
                                            <button
                                                onClick={() => setFreeTrialOpen(true)}
                                                className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-full font-semibold text-sm transition-colors shadow-lg shadow-orange-500/20"
                                            >
                                                14 Gün Ücretsiz Dene
                                            </button>
                                            <Link href="/#pricing" className="px-6 py-3 bg-white hover:bg-slate-50 text-slate-700 rounded-full font-semibold text-sm transition-colors border border-slate-200 text-center">
                                                Paketleri İncele
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Back to Blog */}
                            <div className="mt-12 pt-8 border-t border-slate-200 text-center">
                                <Link href="/blog" className="inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 font-semibold transition-colors">
                                    <ArrowLeft className="w-4 h-4" /> Tüm Blog Yazılarına Dön
                                </Link>
                            </div>
                        </div>
                    </article>
                </main>
                <LandingFooter />
            </div>
            <FreeTrialModal open={freeTrialOpen} onOpenChange={setFreeTrialOpen} />
        </>
    );
}
