import airPurifierImg from "@/assets/categories/air-purifier.jpg";
import chimneyImg from "@/assets/categories/chimney.jpg";
import coffeeMakerImg from "@/assets/categories/coffee-maker.jpg";
import juicerImg from "@/assets/categories/juicer.jpg";
import laptopImg from "@/assets/categories/laptop.jpg";
import microwaveImg from "@/assets/categories/microwave.jpg";
import mobileImg from "@/assets/categories/mobile.jpg";
import refrigeratorImg from "@/assets/categories/refrigerator.jpg";
import tvImg from "@/assets/categories/tv.jpg";
import vacuumCleanerImg from "@/assets/categories/vacuum-cleaner.jpg";
import waterPurifierImg from "@/assets/categories/water-purifier.jpg";
import washingMachineImg from "@/assets/categories/washing-machine.jpg"; // Added Import

export const categoryImages: Record<string, string> = {
  "Air Purifier": airPurifierImg,
  "Chimney": chimneyImg,
  "Coffee Maker": coffeeMakerImg,
  "Juicer": juicerImg,
  "Laptop": laptopImg,
  "Microwave": microwaveImg,
  "Mobile": mobileImg,
  "Refrigerator": refrigeratorImg,
  "TV": tvImg,
  "Vacuum Cleaner": vacuumCleanerImg,
  "Vacuum Cleaner": vacuumCleanerImg,
  "Vaccum Cleaner": vacuumCleanerImg,
  "Washing Machine": washingMachineImg,
  "Water Purifier": waterPurifierImg,
};

export const getCategoryImage = (category: string | null | undefined): string => {
  if (!category) return airPurifierImg; // default fallback
  return categoryImages[category] || airPurifierImg;
};
