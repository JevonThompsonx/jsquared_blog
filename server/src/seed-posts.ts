import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const starterPosts = [
  {
    title: "Our First Hiking Adventure in the Mountains",
    description: "We discovered the most breathtaking trail with stunning mountain views. The fresh air and peaceful surroundings made it an unforgettable experience.",
    category: "Hiking",
    image_url: "https://images.unsplash.com/photo-1551632811-561732d1e306?w=800",
    type: "horizontal",
  },
  {
    title: "Sunset Beach Camping Trip",
    description: "Pitched our tent right by the ocean and watched the sunset paint the sky in brilliant oranges and pinks. The sound of waves was the perfect lullaby.",
    category: "Camping",
    image_url: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800",
    type: "vertical",
  },
  {
    title: "Exploring Hidden Waterfalls",
    description: "After a challenging hike through dense forest, we were rewarded with a stunning hidden waterfall. The mist and rainbows made it magical.",
    category: "Nature",
    image_url: "https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?w=800",
    type: "hover",
  },
  {
    title: "City Adventure: Food Tour Downtown",
    description: "Spent the day exploring local eateries and food markets. Every bite was an adventure in itself, from street tacos to artisanal desserts.",
    category: "Food",
    image_url: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800",
    type: "vertical",
  },
  {
    title: "Stargazing in the Desert",
    description: "Far from city lights, we witnessed the Milky Way in all its glory. The silence and vastness of the desert night sky left us in awe.",
    category: "Camping",
    image_url: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800",
    type: "horizontal",
  },
  {
    title: "Kayaking Through Crystal Waters",
    description: "Paddled through the clearest water we've ever seen. Fish swam beneath us and the reflections of trees created a mirror-like paradise.",
    category: "Water Sports",
    image_url: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800",
    type: "hover",
  },
  {
    title: "Mountain Peak Sunrise",
    description: "Woke up at 4 AM to hike to the summit. Watching the sunrise from the peak made every challenging step worth it.",
    category: "Hiking",
    image_url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
    type: "vertical",
  },
  {
    title: "Cozy Cabin Getaway",
    description: "Escaped to a rustic cabin in the woods. Hot cocoa by the fireplace and morning hikes made for perfect relaxation.",
    category: "Travel",
    image_url: "https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?w=800",
    type: "horizontal",
  },
  {
    title: "Wildlife Photography Expedition",
    description: "Spent the day photographing local wildlife. Captured amazing shots of deer, birds, and even a fox in its natural habitat.",
    category: "Nature",
    image_url: "https://images.unsplash.com/photo-1470093851219-69951fcbb533?w=800",
    type: "hover",
  },
  {
    title: "Bike Trail Through the Forest",
    description: "Cycled 20 miles through winding forest trails. The shade, scenery, and occasional wildlife sightings made it incredible.",
    category: "Biking",
    image_url: "https://images.unsplash.com/photo-1541625602330-2277a4c46182?w=800",
    type: "vertical",
  },
  {
    title: "Farmers Market Sunday",
    description: "Discovered a local farmers market with fresh produce, handmade crafts, and the friendliest vendors. Supporting local never felt so good.",
    category: "Food",
    image_url: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800",
    type: "horizontal",
  },
  {
    title: "Rock Climbing Challenge",
    description: "Tried rock climbing for the first time and conquered our fears. The view from the top and sense of accomplishment was incredible.",
    category: "Adventure",
    image_url: "https://images.unsplash.com/photo-1522163182402-834f871fd851?w=800",
    type: "hover",
  },
  {
    title: "Autumn Leaf Peeping Road Trip",
    description: "Drove through scenic routes to witness fall foliage at its peak. Every turn revealed more vibrant reds, oranges, and yellows.",
    category: "Travel",
    image_url: "https://images.unsplash.com/photo-1507608869274-d3177c8bb4c7?w=800",
    type: "vertical",
  },
  {
    title: "Snorkeling Adventure in Coral Reefs",
    description: "Swam among colorful fish and vibrant coral formations. The underwater world was more beautiful than we imagined.",
    category: "Water Sports",
    image_url: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800",
    type: "horizontal",
  },
  {
    title: "Historic Town Walking Tour",
    description: "Explored cobblestone streets and learned fascinating history about our local town. Old architecture and stories brought the past to life.",
    category: "Culture",
    image_url: "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=800",
    type: "hover",
  },
  {
    title: "Winter Wonderland Snowshoeing",
    description: "Trekked through fresh powder in a winter forest. The quiet beauty and snow-covered trees felt like stepping into a fairy tale.",
    category: "Winter Sports",
    image_url: "https://images.unsplash.com/photo-1491002052546-bf38f186af56?w=800",
    type: "vertical",
  },
  {
    title: "Picnic at the Botanical Gardens",
    description: "Spent a relaxing afternoon surrounded by blooming flowers and manicured gardens. Perfect spot for a romantic picnic.",
    category: "Nature",
    image_url: "https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=800",
    type: "horizontal",
  },
  {
    title: "Zip-lining Through the Canopy",
    description: "Soared through the treetops on an exhilarating zip-line course. The adrenaline rush and bird's-eye views were unforgettable.",
    category: "Adventure",
    image_url: "https://images.unsplash.com/photo-1473172707857-f9e276582ab6?w=800",
    type: "hover",
  },
  {
    title: "Cooking Class Adventure",
    description: "Learned to make authentic pasta from scratch with a local chef. The best part was eating our delicious creations together.",
    category: "Food",
    image_url: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800",
    type: "vertical",
  },
  {
    title: "Lighthouse Visit at Dawn",
    description: "Woke up early to photograph the lighthouse at sunrise. The golden light reflecting off the ocean was absolutely stunning.",
    category: "Photography",
    image_url: "https://images.unsplash.com/photo-1464037866556-6812c9d1c72e?w=800",
    type: "horizontal",
  },
];

async function seedPosts() {
  console.log("Starting to seed posts...");

  // First, get the first user to set as author
  const { data: users, error: userError } = await supabase
    .from("profiles")
    .select("id")
    .limit(1);

  if (userError) {
    console.error("Error fetching users:", userError);
    return;
  }

  if (!users || users.length === 0) {
    console.error("No users found. Please create an admin user first.");
    return;
  }

  const authorId = users[0].id;
  console.log(`Using author ID: ${authorId}`);

  // Insert posts
  const postsWithAuthor = starterPosts.map(post => ({
    ...post,
    author_id: authorId,
  }));

  const { data, error } = await supabase
    .from("posts")
    .insert(postsWithAuthor)
    .select();

  if (error) {
    console.error("Error inserting posts:", error);
    return;
  }

  console.log(`Successfully created ${data?.length || 0} starter posts!`);
  console.log("Posts:", data);
}

seedPosts();
