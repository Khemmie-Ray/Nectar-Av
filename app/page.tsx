import Hero from '@/components/home/Hero';
import Features from '@/components/home/Features';
import Footer from '@/components/home/Footer';
import Header from '@/components/home/Header';

export default function Home() {
  return (
    <main className="min-h-screen bg-white w-[90%] mx-auto">
      <Header />
      <Hero />
      <Features />
      <Footer />
    </main>
  );
}