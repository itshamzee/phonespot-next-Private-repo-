import Image from "next/image";

type CategoryHeroProps = {
  title: string;
  description?: string;
  productCount?: number;
  backgroundImage?: string;
};

export function CategoryHero({
  title,
  description,
  productCount,
  backgroundImage,
}: CategoryHeroProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl">
      {backgroundImage ? (
        <Image
          src={backgroundImage}
          alt={title}
          fill
          className="object-cover"
          priority
        />
      ) : null}
      <div
        className={`relative px-8 py-12 md:px-12 md:py-16 ${
          backgroundImage
            ? "bg-black/50"
            : "bg-gradient-to-r from-green-600 to-green-700"
        }`}
      >
        <div className="max-w-2xl">
          {productCount !== undefined && (
            <span className="mb-3 inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-sm font-medium text-white backdrop-blur-sm">
              {productCount} produkter
            </span>
          )}
          <h1 className="font-display text-4xl font-bold text-white md:text-5xl">
            {title}
          </h1>
          {description && (
            <p className="mt-3 text-lg text-white/80">{description}</p>
          )}
        </div>
      </div>
    </div>
  );
}
