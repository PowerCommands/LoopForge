import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

const HELP_SECTIONS = [
  {
    title: "Studio",
    body:
      "Studio is where you generate one loop at a time. Use the left sidebar to choose key, scale, tempo, loop length, mood, active layers, and sequence settings before generating a new idea.",
  },
  {
    title: "Piano Roll",
    body:
      "The Piano Roll shows the current loop as editable notes for chords, melody, and bass. You can move notes, resize them, delete them, transpose the whole loop, and switch the active edit layer without changing the basic timing grid.",
  },
  {
    title: "Save And Add",
    body:
      "Save stores the current edited loop state so the Current Loop summary follows your latest approved version. Add creates a new named loop in the arrangement from the current Piano Roll so you can build a song structure with several loop ideas.",
  },
  {
    title: "Arrangement",
    body:
      "The Arrangement panel on the right is where you collect loops into a draft song structure. You can rename loops, drag to reorder them, preview them, reopen a loop for editing, remove loops, and save the arrangement to the library.",
  },
  {
    title: "Library",
    body:
      "Library shows saved arrangements. From there you can reopen an arrangement in Studio, preview its loops, export it, or remove it from local storage.",
  },
  {
    title: "Lyrics",
    body:
      "Lyrics lets you attach text to saved arrangements. Choose an arrangement, work on the left and right lyric panes, and keep your words connected to the musical structure you already saved.",
  },
  {
    title: "Settings",
    body:
      "Settings focuses on storage and maintenance. It is where you inspect app data, backup behavior, Dropbox sync, and the saved arrangement library model.",
  },
  {
    title: "Typical Workflow",
    body:
      "A common flow is: generate a loop in Studio, refine it in the Piano Roll, Save when the edit is approved, Add it to the Arrangement, repeat for more sections, then save the full arrangement to Library and continue with lyrics or export.",
  },
] as const;

export function HelpWorkspace() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Help</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
          <p className="m-0">
            Loop Forge is built to help you sketch loops quickly, shape them into usable ideas, and assemble those ideas into
            a simple arrangement without leaving the app.
          </p>
          <p className="m-0">
            The sections below describe what each part of the program does and how they fit together in a practical workflow.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {HELP_SECTIONS.map((section) => (
          <Card key={section.title} className="bg-white/55 dark:bg-[#17152d]">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{section.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="m-0 text-sm leading-6 text-muted-foreground">{section.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
