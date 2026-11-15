import BackgroundMusic from "@/components/BackgroundMusic";
import BackgroundVideo from "@/components/BackgroundVideo";
import Hero from "@/components/Hero";
import Welcome from "@/components/Welcome";
import Details from "@/components/Details";
import Rsvp from "@/components/Rsvp";
import Footer from "@/components/Footer";

export default function Page() {
  return (
    <main>
      <BackgroundMusic />
      <BackgroundVideo />
      <Hero />
      <div className="relative">
      <Welcome />
      <Details />
      <Rsvp />
      <Footer />
      </div>
    </main>
  );
}
