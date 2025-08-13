import { FC } from 'react';

const About: FC = () => {
  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-center mb-8">About Us</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="prose lg:prose-xl">
            <p>
              Welcome to J²Adventures, your number one source for all things travel, food, and lifestyle. We're dedicated to giving you the very best of our experiences, with a focus on dependability, customer service and uniqueness.
            </p>
            <p>
              Founded in 2023 by John and Jane Doe, J²Adventures has come a long way from its beginnings in a home office. When John and Jane first started out, their passion for sharing their adventures with the world drove them to do intense research, and gave them the impetus to turn hard work and inspiration into to a booming online blog. We now serve readers all over the world, and are thrilled to be a part of the quirky, eco-friendly, fair trade wing of the blogging industry.
            </p>
          </div>
          <div>
            <img src="https://placehold.co/600x400/EEE/31343C?text=Our+Team" alt="Our Team" className="rounded-lg shadow-lg" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
