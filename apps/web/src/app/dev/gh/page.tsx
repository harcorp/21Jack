import type { Metadata } from "next";
import { Gallery } from "./Gallery";

export const metadata: Metadata = { title: "Grand Hall components · 21Jack" };

export default function DevGrandHallPage() {
  return <Gallery />;
}
