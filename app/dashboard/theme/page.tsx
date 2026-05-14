"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useSettings, type BaseColor, type BackgroundColor, type ChartColor, type ThemeMode, type BorderShadowMode } from "@/components/providers/settings-provider";
import { Palette, Monitor, Sparkles, ArrowLeft, Sun, Moon, Layout } from "lucide-react";
import { AppHeader } from "@/components/layout/app-header";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

// Font mapping
const fontMap: Record<string, string> = {
  Geist_Sans: "var(--font-geist-sans)",
  Geist_Mono: "var(--font-geist-mono)",
  Inter: "Inter, sans-serif",
  system: "system-ui, sans-serif",
};

const baseColors: { value: BaseColor; label: string; preview: string }[] = [
  { value: "slate", label: "Schiefer", preview: "bg-slate-500" },
  { value: "gray", label: "Grau", preview: "bg-gray-500" },
  { value: "zinc", label: "Zink", preview: "bg-zinc-500" },
  { value: "neutral", label: "Neutral", preview: "bg-neutral-500" },
  { value: "stone", label: "Stein", preview: "bg-stone-500" },
  { value: "blue", label: "Blau", preview: "bg-blue-500" },
  { value: "green", label: "Grün", preview: "bg-green-500" },
  { value: "orange", label: "Orange", preview: "bg-orange-500" },
  { value: "red", label: "Rot", preview: "bg-red-500" },
  { value: "violet", label: "Violett", preview: "bg-violet-500" },
  { value: "rose", label: "Rosa", preview: "bg-rose-500" },
  { value: "amber", label: "Bernstein", preview: "bg-amber-500" },
  { value: "cyan", label: "Cyan", preview: "bg-cyan-500" },
  { value: "emerald", label: "Smaragd", preview: "bg-emerald-500" },
  { value: "fuchsia", label: "Fuchsia", preview: "bg-fuchsia-500" },
  { value: "indigo", label: "Indigo", preview: "bg-indigo-500" },
  { value: "lime", label: "Limette", preview: "bg-lime-500" },
  { value: "pink", label: "Pink", preview: "bg-pink-500" },
  { value: "sky", label: "Himmel", preview: "bg-sky-500" },
  { value: "teal", label: "Blaugrün", preview: "bg-teal-500" },
  { value: "yellow", label: "Gelb", preview: "bg-yellow-500" },
];

const backgroundColors: { value: BackgroundColor; label: string; preview: string }[] = [
  { value: "neutral", label: "Neutral", preview: "bg-neutral-500" },
  { value: "stone", label: "Stein", preview: "bg-stone-500" },
  { value: "zinc", label: "Zinc", preview: "bg-zinc-500" },
  { value: "mauve", label: "Mauve", preview: "bg-purple-500" },
  { value: "olive", label: "Olive", preview: "bg-green-700" },
  { value: "mist", label: "Mist", preview: "bg-blue-300" },
  { value: "taupe", label: "Taupe", preview: "bg-amber-800" },
];

const chartColorOptions: { value: ChartColor; label: string; preview: string }[] = [
  { value: "default", label: "Standard", preview: "bg-slate-500" },
  { value: "purple", label: "Violett", preview: "bg-violet-500" },
  { value: "blue", label: "Blau", preview: "bg-blue-500" },
  { value: "green", label: "Grün", preview: "bg-green-500" },
  { value: "orange", label: "Orange", preview: "bg-orange-500" },
  { value: "red", label: "Rot", preview: "bg-red-500" },
  { value: "pink", label: "Pink", preview: "bg-pink-500" },
  { value: "indigo", label: "Indigo", preview: "bg-indigo-500" },
  { value: "cyan", label: "Cyan", preview: "bg-cyan-500" },
  { value: "amber", label: "Bernstein", preview: "bg-amber-500" },
  { value: "lime", label: "Limette", preview: "bg-lime-500" },
  { value: "sky", label: "Himmel", preview: "bg-sky-500" },
  { value: "teal", label: "Blaugrün", preview: "bg-teal-500" },
];

const fonts = [
  { value: "Geist_Sans", label: "Geist Sans" },
  { value: "Geist_Mono", label: "Geist Mono" },
  { value: "Inter", label: "Inter" },
  { value: "system", label: "System" },
];

const themes: { value: ThemeMode; label: string; icon: React.ReactNode }[] = [
  { value: "light", label: "Hell", icon: <Sun className="w-4 h-4" /> },
  { value: "dark", label: "Dunkel", icon: <Moon className="w-4 h-4" /> },
  { value: "system", label: "System", icon: <Monitor className="w-4 h-4" /> },
];

export default function ThemeCustomizationPage() {
  const ctx = useSettings();
  const [localRadius, setLocalRadius] = useState(ctx.settings.theme.radius);

  const handleRadiusChange = (value: number[]) => {
    setLocalRadius(value[0]);
    ctx.updateTheme({ radius: value[0] });
  };

  // Sample data for chart preview
  const sampleChartData = [
    { name: "Mathe", value: 12 },
    { name: "Physik", value: 8 },
    { name: "Chemie", value: 5 },
    { name: "Biologie", value: 3 },
  ];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <AppHeader
          title="Theme-Anpassung"
          description="Passen Sie das Erscheinungsbild Ihrer UntisStats-Erfahrung an."
          icon={<Palette className="w-6 h-6" />}
          actions={
            <Button asChild variant="outline">
              <Link href="/dashboard">
                <ArrowLeft className="w-4 h-4" />
                Zurück zum Dashboard
              </Link>
            </Button>
          }
        />

        <div className="grid gap-6 md:grid-cols-2">
          {/* Theme Mode */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="w-5 h-5" />
                Theme
              </CardTitle>
              <CardDescription>Wählen Sie zwischen hellem, dunklem oder System-Theme</CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={ctx.settings.theme.theme}
                onValueChange={(value) => ctx.updateTheme({ theme: value as ThemeMode })}
                className="grid grid-cols-3 gap-4"
              >
                {themes.map((t) => (
                  <div key={t.value}>
                    <RadioGroupItem
                      value={t.value}
                      id={`theme-${t.value}`}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={`theme-${t.value}`}
                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                    >
                      {t.icon}
                      <span className="mt-2 text-sm font-medium">{t.label}</span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>

{/* Base Color */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Akzentfarbe
                </CardTitle>
                <CardDescription>Wählen Sie die primäre Farbe der App</CardDescription>
              </CardHeader>
              <CardContent>
                  <Select
                    value={ctx.settings.theme.baseColor}
                    onValueChange={(value) => ctx.updateTheme({ baseColor: value as BaseColor })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Akzentfarbe wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {baseColors.map((color) => (
                        <SelectItem key={color.value} value={color.value}>
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded-full ${color.preview}`} />
                            {color.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
              </CardContent>
            </Card>

{/* Background Color */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="w-5 h-5" />
                  Hintergrundfarbe
                </CardTitle>
                <CardDescription>Wählen Sie die Farbe für Hintergrund und Oberflächen</CardDescription>
              </CardHeader>
              <CardContent>
                  <Select
                    value={ctx.settings.theme.backgroundColor}
                    onValueChange={(value) => ctx.updateTheme({ backgroundColor: value as BackgroundColor })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Hintergrundfarbe wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {backgroundColors.map((color) => (
                        <SelectItem key={color.value} value={color.value}>
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded-full ${color.preview}`} />
                            {color.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
              </CardContent>
            </Card>

            {/* Chart Colors */}
           <Card>
            <CardHeader>
              <CardTitle>Diagrammfarben</CardTitle>
              <CardDescription>Farbschema für Graphen und Visualisierungen</CardDescription>
            </CardHeader>
            <CardContent>
                <Select
                  value={ctx.settings.theme.chartColor}
                  onValueChange={(value) => ctx.updateTheme({ chartColor: value as ChartColor })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Diagrammfarbe wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {chartColorOptions.map((c) => (
<SelectItem key={c.value} value={c.value}>
                       <div className="flex items-center gap-2">
                         <div className={`w-4 h-4 rounded-full ${c.preview}`} />
                         {c.label}
                       </div>
                     </SelectItem>
                   ))}
                 </SelectContent>
              </Select>
            </CardContent>
          </Card>

{/* Border Radius */}
           <Card>
             <CardHeader>
               <CardTitle>Randradius</CardTitle>
               <CardDescription>Rundheit der Ecken anpassen</CardDescription>
             </CardHeader>
             <CardContent className="space-y-4">
               <Slider
                 value={[localRadius]}
                 min={0}
                 max={1}
                 step={0.05}
                 onValueChange={handleRadiusChange}
                 className="w-full"
               />
               <div className="flex justify-between text-sm text-muted-foreground">
                 <span>Scharf</span>
                 <span className="font-mono">{(localRadius * 16).toFixed(0)}px</span>
                 <span>Rund</span>
               </div>
               <div className="flex gap-2">
                 {[0, 0.25, 0.5, 0.75, 1].map((r) => (
                   <button
                     key={r}
                     onClick={() => handleRadiusChange([r])}
                     className={`h-8 flex-1 rounded-md border-2 transition-colors ${
                       ctx.settings.theme.radius === r ? "border-primary bg-primary/5" : "border-muted"
                     }`}
                     style={{ borderRadius: `${r * 8}px` }}
                   />
                 ))}
               </div>
             </CardContent>
           </Card>

           {/* Heading Font */}
           <Card>
             <CardHeader>
               <CardTitle>Überschrift-Schriftart</CardTitle>
               <CardDescription>Schriftart für Überschriften und Titel</CardDescription>
             </CardHeader>
             <CardContent>
               <Select
                 value={ctx.settings.theme.headingFont}
                 onValueChange={(value) => ctx.updateTheme({ headingFont: value })}
               >
                 <SelectTrigger>
                   <SelectValue placeholder="Schriftart wählen" />
                 </SelectTrigger>
                 <SelectContent>
                   {fonts.map((font) => (
                     <SelectItem key={font.value} value={font.value}>
                       <span style={{ fontFamily: fontMap[font.value] || "sans-serif" }}>
                         {font.label}
                       </span>
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </CardContent>
           </Card>

           {/* Body Font */}
           <Card>
             <CardHeader>
               <CardTitle>Text-Schriftart</CardTitle>
               <CardDescription>Schriftart für regulären Text</CardDescription>
             </CardHeader>
             <CardContent>
               <Select
                 value={ctx.settings.theme.bodyFont}
                 onValueChange={(value) => ctx.updateTheme({ bodyFont: value })}
               >
                 <SelectTrigger>
                   <SelectValue placeholder="Schriftart wählen" />
                 </SelectTrigger>
                 <SelectContent>
                   {fonts.map((font) => (
                     <SelectItem key={font.value} value={font.value}>
                       <span style={{ fontFamily: fontMap[font.value] || "sans-serif" }}>
                         {font.label}
                       </span>
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
              </CardContent>
            </Card>

            {/* Border & Shadow Mode */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layout className="w-5 h-5" />
                  Rahmen & Schatten
                </CardTitle>
                <CardDescription>Wählen Sie, ob Karten Rahmen oder Schatten verwenden sollen</CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={ctx.settings.theme.borderShadowMode}
                  onValueChange={(value) => ctx.updateTheme({ borderShadowMode: value as BorderShadowMode })}
                  className="grid grid-cols-3 gap-4"
                >
                  {[
                    { value: "both", label: "Beide", description: "Rahmen und Schatten" },
                    { value: "borders", label: "Nur Rahmen", description: "Keine Schatten" },
                    { value: "shadows", label: "Nur Schatten", description: "Kein Rahmen" },
                  ].map((option) => (
                    <div key={option.value}>
                      <RadioGroupItem
                        value={option.value}
                        id={`borderShadow-${option.value}`}
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor={`borderShadow-${option.value}`}
                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                      >
                        <span className="mt-2 text-sm font-medium">{option.label}</span>
                        <span className="text-xs text-muted-foreground">{option.description}</span>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>

          </div>

         {/* Preview Section */}
         <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Live-Vorschau
            </CardTitle>
            <CardDescription>Sehen Sie Ihre Theme-Änderungen in Echtzeit einschließlich Diagrammen</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row md:gap-6">
              <div className="space-y-4 md:flex-1">
                <div className="space-y-2">
                  <h1 className="text-4xl font-bold tracking-tight">
                    Überschrift-Beispiel
                  </h1>
                  <p className="text-lg text-muted-foreground">
                    Text mit Ihren ausgewählten Schriftarten und Farben.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button>Primärer Button</Button>
                  <Button variant="secondary">Sekundär</Button>
                  <Button variant="outline">Umriss</Button>
                  <Button variant="ghost">Text</Button>
                </div>
                <div className="flex items-center gap-4">
                  <div className="h-24 w-full max-w-xs rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
                    <span className="text-sm font-medium">Kartenvorschau</span>
                  </div>
                  <Switch checked={true} />
                </div>
              </div>

               <div className="mt-6 md:mt-0 md:w-[400px] md:flex-shrink-0">
                <h3 className="text-lg font-semibold text-foreground mb-3">Diagrammvorschau</h3>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sampleChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                               <div className="bg-card p-3 shadow-lg rounded-lg border border-border">
                                <p className="font-medium text-foreground">{data.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  Fehlzeiten: <span className="font-medium text-foreground">{data.value}</span>
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {sampleChartData.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={ctx.chartColors[index % ctx.chartColors.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
