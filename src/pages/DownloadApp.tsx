import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Smartphone, Apple, MapPin, Battery, Shield, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const DownloadApp = () => {
  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link to="/worker" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-1" /> Tillbaka
        </Link>

        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold">Ladda ner appen</h1>
          <p className="text-muted-foreground text-lg">
            För att GPS-incheckning ska fungera även när telefonen är låst behöver du använda appen – inte webbläsaren.
          </p>
        </div>

        <Card className="border-primary/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" /> Varför en app?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex gap-3">
              <MapPin className="h-5 w-5 text-primary shrink-0" />
              <p><strong className="text-foreground">Bakgrunds-GPS:</strong> Webbläsare stoppar all GPS så snart du stänger fliken. Appen fortsätter pinga 24/7.</p>
            </div>
            <div className="flex gap-3">
              <Battery className="h-5 w-5 text-primary shrink-0" />
              <p><strong className="text-foreground">Batterivänlig:</strong> Native bakgrundsspårning är optimerat och drar mindre batteri än webbläsaren.</p>
            </div>
            <div className="flex gap-3">
              <Smartphone className="h-5 w-5 text-primary shrink-0" />
              <p><strong className="text-foreground">Push-notiser:</strong> Få direkt meddelande om in-/utcheckning och andra händelser.</p>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Apple className="h-5 w-5" /> iPhone (iOS)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Appen kommer snart till App Store. Kontakta din admin för en TestFlight-inbjudan så länge.
              </p>
              <Button className="w-full" disabled>
                Kommer snart till App Store
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" /> Android
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Appen kommer snart till Google Play. Kontakta din admin för en testlänk så länge.
              </p>
              <Button className="w-full" disabled>
                Kommer snart till Google Play
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-muted/30">
          <CardHeader>
            <CardTitle className="text-base">Viktigt vid installation</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>När du installerar appen – välj <strong className="text-foreground">"Tillåt alltid"</strong> för platsåtkomst.</p>
            <p>Annars stoppas GPS-pingarna så fort du låser telefonen, precis som i webbläsaren.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DownloadApp;
