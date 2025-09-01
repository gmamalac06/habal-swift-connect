import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-habal.jpg";

const Index = () => {
  return (
    <main>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(1200px_600px_at_50%_-200px,hsl(var(--primary)/0.25),transparent_60%)]" aria-hidden="true" />
        <div className="container mx-auto grid items-center gap-8 py-20 md:grid-cols-2">
          <div>
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
              Fast, safe habal-habal rides in Cotabato City
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Seamless platform for commuters, drivers, and admins. Secure bookings, transparent fares, and simple management.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/auth"><Button variant="hero">Get Started</Button></Link>
              <Link to="/book"><Button variant="outline">Book a Ride</Button></Link>
            </div>
          </div>
          <div className="relative">
            <img src={heroImage} alt="Habal-habal ride in Cotabato City" loading="lazy" className="mx-auto w-full max-w-xl rounded-lg shadow-[var(--shadow-soft)]" />
          </div>
        </div>
      </section>
    </main>
  );
};

export default Index;
