/**
 * Seeds 3 existing published posts with long-form rich HTML content that
 * exercises all prose styling: h2–h4 headings, bold, italic, blockquote,
 * ul, ol, hr, inline images (Unsplash), and links.
 *
 * Run: bun run ./scripts/seed-rich-content.ts
 */

import { eq, inArray } from "drizzle-orm";

import { getDb } from "../src/lib/db-core";
import { loadEnvironmentFiles } from "../src/lib/env-loader";
import { posts } from "../src/drizzle/schema";

loadEnvironmentFiles();

function legacyHtml(html: string) {
  return JSON.stringify({ type: "legacy-html", html });
}

function unsplash(id: string, alt: string) {
  return `<img src="https://images.unsplash.com/photo-${id}?w=900&q=80&auto=format&fit=crop" alt="${alt}" style="width:100%;border-radius:0.75rem;margin:1.5rem 0;" />`;
}

// ---------------------------------------------------------------------------
// Post 1 — Hidden Waterfalls
// ---------------------------------------------------------------------------
const waterfallsHtml = `
<p>There is something almost devotional about the act of searching for a waterfall you cannot yet hear. You follow a thread of trail through old-growth timber, boots dampening on the moss-laced ground, and the forest holds its breath around you. Then — a low, persistent murmur that grows until it is all you can think about.</p>

${unsplash("1546268060-2592ff93ee24", "A tall waterfall cascading through a mossy gorge")}

<h2>How We Found It</h2>

<p>We had been driving the <strong>Olympic Peninsula loop</strong> for three days when a gas-station attendant in Forks mentioned a trail that didn't appear on any of our maps. He sketched it on a paper napkin — a dotted line veering off a forest service road, ending in a small blue circle he labeled <em>"the good one."</em></p>

<p>His only directions:</p>
<ol>
  <li>Drive until the pavement ends.</li>
  <li>Keep driving another mile on gravel.</li>
  <li>Park at the cedar stump that looks like a bear.</li>
  <li>Walk forty minutes into the quiet.</li>
</ol>

<h3>The Approach</h3>

<p>The trail was barely a trail — more of a suggestion through sword ferns and oxalis. Nurse logs bridged the low spots, their bark soft as velvet underfoot. We moved slowly, partly from caution and partly because we didn't want it to end. <em>This is the part they don't put in travel magazines:</em> the approach, with its uncertainty and its smell of damp earth, is often the best part of the whole day.</p>

${unsplash("1448375240586-882707db888b", "Dense old-growth forest with dappled morning light")}

<blockquote>
<p>"Not all those who wander are lost — but some of us are absolutely using a napkin map drawn by a stranger at a gas station."</p>
</blockquote>

<h3>What We Carried</h3>

<p>Overpacking for a day hike is a real and embarrassing habit. Here is what actually mattered:</p>
<ul>
  <li><strong>Water filter</strong> — every stream looks clean until it isn't</li>
  <li><strong>Rain shell</strong> — the Olympic Peninsula has its own opinions about weather</li>
  <li>Two sandwiches and one extra sandwich</li>
  <li>A dry bag for the camera</li>
  <li><em>No bluetooth speaker</em> — please, for everyone's sake</li>
</ul>

<h2>The Falls Themselves</h2>

<p>We heard them long before we saw them: a deep, chest-felt resonance that separated itself from the general hiss of wind in the canopy. The trail bent around a boulder field and there they were — a double-drop, maybe sixty feet total, pouring into a plunge pool of startling green opacity.</p>

${unsplash("1501854140801-50d01698950b", "Aerial view of a mountain river valley with waterfalls")}

<h4>Light and Timing</h4>

<p>Midday light on a waterfall is almost always flat and uninspiring. We arrived around <strong>10 a.m.</strong> with the sun still at a low enough angle to catch the mist and throw small rainbows into the spray zone. Give yourself a two-hour window on either side of midday and you will almost always be rewarded.</p>

<h2>Practical Notes</h2>

<hr />

<p>A few things worth knowing before you go looking for your own napkin-map waterfall:</p>

<ol>
  <li><strong>Forest service roads close seasonally</strong> — check with the ranger district before you drive three hours on a hunch.</li>
  <li>A GPS track downloaded offline is worth more than a phone signal you won't have anyway.</li>
  <li>The approach is almost always better when you go alone or with one other person. Groups change the math.</li>
  <li><em>Leave the campfire for the campground.</em> Dry years make the forest nervous.</li>
</ol>

<h3>Getting There Without a Napkin</h3>

<p>We eventually found this location on a <a href="https://www.hikingproject.com" target="_blank" rel="noreferrer">Hiking Project</a> listing submitted by a trail runner in 2019. The GPS coordinates matched the napkin almost exactly. Some secrets have a short half-life.</p>

<p>The best waterfalls are the ones you earn. Not through suffering — through patience, through slow mornings and wrong turns and asking people questions in gas stations. The waterfall is the destination but the day is the point.</p>
`;

// ---------------------------------------------------------------------------
// Post 2 — Mountain Peak Sunrise
// ---------------------------------------------------------------------------
const sunriseHtml = `
<p>The alarm goes off at 3:15 a.m. and for a brief, warm moment under your sleeping bag you will seriously consider every choice that led you here. Then you remember why you set it, and you start moving before the reasoning part of your brain wakes up and talks you out of it.</p>

${unsplash("1454496522488-7a8e488e8606", "Dramatic alpine sunrise with cloud sea below the peaks")}

<h2>Starting in the Dark</h2>

<p>A summit sunrise hike operates on a simple premise: if you want to be at the top when the light arrives, you need to <strong>leave the trailhead while it is still fully dark</strong>. For most alpine routes, this means departing three to five hours before the listed sunrise time. The math is unforgiving and non-negotiable.</p>

<h3>What Changes in the Dark</h3>

<p>The trail you hiked in daylight is a different place at 3 a.m. Your headlamp compresses the world into a cone of useful radius. Everything outside that cone is theoretical. This narrowing of perception is, unexpectedly, <em>one of the great gifts of the alpine start</em> — there is no view to get distracted by, no Instagram composition to frame. There is only the next step and the next.</p>

<blockquote>
<p>The mountain does not care about your schedule, your gear list, or your follower count. It only cares whether your legs work and whether your judgement is sound.</p>
</blockquote>

${unsplash("1476514525535-07fb3b4ae5f1", "A winding mountain road disappearing into mist at dawn")}

<h2>The Gear That Actually Matters</h2>

<p>You will read a lot of gear lists. Most of them are written by people with affiliate codes. Here is a shorter, more honest version:</p>

<h3>Non-Negotiable</h3>
<ul>
  <li><strong>Headlamp with fresh batteries</strong> — not your phone's flashlight, a real headlamp</li>
  <li><strong>Insulating layer</strong> — summit temperatures at dawn are 20–30°F colder than the valley</li>
  <li>Water (at least 2L) and something caloric enough to matter</li>
  <li>A map or downloaded GPS route — cell coverage ends well below treeline</li>
</ul>

<h3>Things People Overpack</h3>
<ul>
  <li>Tripods heavier than 1kg — your arms become the tripod above treeline</li>
  <li><em>Trekking poles for every hike</em> — on technical terrain they create as many problems as they solve</li>
  <li>Three layers when two will do</li>
</ul>

<hr />

<h2>The Moment Itself</h2>

<p>There is a specific sequence of light that happens in the fifteen minutes before sunrise that I have watched perhaps thirty times and have never successfully described to anyone who wasn't there. It begins with a slight lightening of the eastern horizon, almost imaginary. Then the peaks catch <strong>alpenglow</strong> — a pink-to-orange flush that moves down the mountain faces like a slow tide. The valleys below are still dark and full of cloud. You are standing in the fire while the world below sleeps.</p>

${unsplash("1506905925346-21bda4d32df4", "Golden alpenglow on a high mountain summit ridge")}

<h4>Why Photographs Don't Cover It</h4>

<p>The camera can record the colour but not the cold, not the effort in your legs, not the specific quality of silence that exists at 9,000 feet at 5 a.m. The photograph is a reminder for you. It is a pale substitute for everyone else.</p>

<p>That said — here is how to make it a slightly less pale substitute:</p>
<ol>
  <li>Shoot toward the light, not away from it. The backlit ridgeline is almost always more interesting than the lit landscape behind you.</li>
  <li>Put a person in the frame. Scale transforms a nice mountain photo into something that communicates.</li>
  <li><em>Wait five minutes after you think the best light has passed.</em> It usually hasn't.</li>
</ol>

<h2>The Descent</h2>

<p>The descent after a summit sunrise is one of the more pleasant physical experiences available without a prescription. Your legs are warm, your pack is lighter (you ate everything), and the trail you stumbled up in the dark is now fully visible and friendly. The valley slowly reveals itself below you — farms, rivers, roads, <strong>the world you live in but rarely see from above.</strong></p>

<p>Be at the trailhead before noon. Eat a large second breakfast somewhere with hot coffee. Sleep with unusual depth that afternoon. Repeat when the season allows.</p>
`;

// ---------------------------------------------------------------------------
// Post 3 — Stargazing in the Desert
// ---------------------------------------------------------------------------
const stargazingHtml = `
<p>The <strong>Bortle scale</strong> runs from 1 to 9. Class 9 is the washed-out suburban sky most people consider normal — a handful of stars, a dominant orange glow on every horizon, the Milky Way entirely absent. Class 1 is a sky so dark that you can read your own shadow cast by starlight alone. On the night we drove into the Utah desert, we were hunting for a Class 2.</p>

${unsplash("1419242902214-272b3f66ee7a", "The Milky Way arching over a dark desert landscape with red rock formations")}

<h2>Finding Real Darkness</h2>

<p>Light pollution maps are the starting point, not the destination. The <a href="https://www.lightpollutionmap.info" target="_blank" rel="noreferrer">Light Pollution Map</a> will show you the dark zones, but it won't tell you about the mining operation on the other side of the ridge, or the fact that a nearby town floods the southern horizon with orange sodium light from 9 p.m. onward. <em>You need to drive it and look.</em></p>

<h3>The Best Dark-Sky Sites Nobody Talks About</h3>

<ul>
  <li><strong>BLM land outside Capitol Reef, Utah</strong> — almost no visitors after 8 p.m., reliable Class 2 skies</li>
  <li><strong>The Alvord Desert, Oregon</strong> — brutal to reach, impossible to forget</li>
  <li>Central Nevada along Highway 375 — no infrastructure, no light, and the unsettling conviction that you are very far from help</li>
  <li><em>Any high-altitude meadow on a moonless night</em> — elevation adds darkness faster than distance</li>
</ul>

<blockquote>
<p>The desert at night is not empty. It is extremely full of things that don't care whether you are there or not. This is one of the more useful things it can teach you.</p>
</blockquote>

${unsplash("1504280390367-361c6d9f38f4", "A campfire glowing under a brilliant star-filled sky")}

<h2>Equipment for Actual Stargazing</h2>

<p>The photography community has made stargazing seem equipment-intensive. It doesn't have to be. Here is the honest gear breakdown:</p>

<h3>If You Just Want to See It</h3>
<ul>
  <li>Your eyes — give them 20 minutes to fully dark-adapt; no phone screens during this time</li>
  <li>A reclining camp chair or a sleeping pad flat on the ground</li>
  <li><strong>A red-light headlamp</strong> — red light preserves night vision, white light destroys it</li>
  <li>More layers than you think you need (desert nights drop 40–50°F from the daytime high)</li>
</ul>

<h3>If You Want to Photograph It</h3>

<ol>
  <li>A camera with manual exposure control — any mirrorless or DSLR will do</li>
  <li>The widest lens you own, ideally f/2.8 or faster</li>
  <li>A sturdy tripod (this time it is actually necessary)</li>
  <li><strong>Remote shutter or 2-second timer</strong> — touching the camera introduces vibration</li>
  <li>Extra batteries — cold and long exposures drain them fast</li>
</ol>

<hr />

<h2>What We Saw That Night</h2>

<p>We arrived at the site around 9:30 p.m., two hours after local sunset. The Milky Way was already fully visible — a dense, textured band that crossed the entire sky from south to north, <strong>broad enough to cast a faint shadow on the white sand at our feet.</strong> In thirty years of casual stargazing I had seen it perhaps four times with that kind of clarity.</p>

${unsplash("1464822759023-fed622ff2c3b", "Reflection of stars in a perfectly still alpine lake")}

<h4>The Planets</h4>

<p>Jupiter was setting in the west, bright enough to be mistaken for an aircraft. Saturn was higher, distinctly cream-coloured against the blue-white of the surrounding stars. Through our 10×42 binoculars, Jupiter showed four distinct points of light arranged in a line — the <em>Galilean moons</em>, just as Galileo saw them in 1610 using an instrument far inferior to what you can buy at a department store today.</p>

<h3>Satellites and Meteors</h3>

<p>In an hour of watching we counted:</p>
<ul>
  <li><strong>14 Starlink satellites</strong> in three distinct trains — a growing and controversial feature of modern dark-sky observing</li>
  <li>7 other satellites (probably ISS, weather birds, and classified items)</li>
  <li><em>3 bright meteors</em>, one of which left a visible ionisation trail that persisted for nearly four seconds</li>
</ul>

<h2>On Staying Long Enough</h2>

<p>Most people who drive to a dark-sky site spend ninety minutes and leave. The sky at 11 p.m. is not the sky at 2 a.m. The Milky Way core rises and shifts. New constellations appear. Your eyes continue to adapt — the improvement between thirty minutes and two hours of dark adaptation is dramatic and almost nobody experiences it because they have gone back to their phones by then.</p>

<p><strong>Set an alarm for 2 a.m. and stay until it goes off.</strong> Wrap yourself in everything you brought. Lie on your back. Let the scale of it work on you slowly. This is the whole point and it cannot be rushed.</p>
`;

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const SLUGS_TO_UPDATE = [
  "exploring-hidden-waterfalls",
  "mountain-peak-sunrise",
  "stargazing-in-the-desert",
];

const CONTENT_MAP: Record<string, { html: string; excerpt: string }> = {
  "exploring-hidden-waterfalls": {
    html: waterfallsHtml,
    excerpt: "A napkin map from a gas-station attendant leads us into the Olympic Peninsula's old-growth forest in search of a waterfall that doesn't appear on any official map.",
  },
  "mountain-peak-sunrise": {
    html: sunriseHtml,
    excerpt: "The alarm goes off at 3:15 a.m. Here is everything honest about chasing alpenglow from a mountain summit — the dark approach, the cold, and the fifteen minutes that make it worth it.",
  },
  "stargazing-in-the-desert": {
    html: stargazingHtml,
    excerpt: "A Class 2 Bortle sky in the Utah desert — Milky Way bright enough to cast shadows, Saturn through binoculars, and a lesson in the value of staying until 2 a.m.",
  },
};

async function main() {
  const db = getDb();

  // Fetch by slug — try both direct slug and slugified-title pattern
  const allPosts = await db
    .select({ id: posts.id, slug: posts.slug, title: posts.title })
    .from(posts);

  for (const [targetSlug, content] of Object.entries(CONTENT_MAP)) {
    // Match on slug field containing the target slug (case-insensitive, partial)
    const match = allPosts.find(
      (p) =>
        p.slug.toLowerCase().includes(targetSlug.replace(/-/g, " ").split(" ")[1]) ||
        p.title.toLowerCase().replace(/\s+/g, "-").includes(targetSlug.replace(/^[a-z]+-/, "")) ||
        p.slug === targetSlug,
    );

    if (!match) {
      console.log(`  ⚠  No match for "${targetSlug}" — skipping`);
      continue;
    }

    await db
      .update(posts)
      .set({
        contentJson: legacyHtml(content.html),
        excerpt: content.excerpt,
        updatedAt: new Date(),
      })
      .where(eq(posts.id, match.id));

    console.log(`  ✓ Updated "${match.title}" (${match.slug})`);
  }

  console.log("\nDone. Open one of the updated posts in the blog to preview the styling.");
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
