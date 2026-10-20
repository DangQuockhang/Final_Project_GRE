import React from 'react';
import HeroSection from '../components/home/HeroSection.jsx';
import ShopByCategory from '../components/home/ShopByCategory.jsx';
import FeaturedProducts from '../components/home/FeaturedProducts.jsx';
import EditorialStory from '../components/home/EditorialStory.jsx';
import FeaturedBrands from '../components/home/FeaturedBrands.jsx';
import ClosingBanner from '../components/home/ClosingBanner.jsx';
export default function HomePage({products,brands,fittingUrl}){
 return <div className="kd26-home">
  <HeroSection/>
  <ShopByCategory/>
  <FeaturedProducts products={products}/>
  <EditorialStory/>
  <FeaturedBrands brands={brands}/>
  <ClosingBanner/>
 </div>;
}
