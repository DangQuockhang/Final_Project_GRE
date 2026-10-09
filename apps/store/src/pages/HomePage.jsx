import React from 'react';
import HeroSection from '../components/home/HeroSection.jsx';
import StoreBenefits from '../components/home/StoreBenefits.jsx';
import FeaturedProducts from '../components/home/FeaturedProducts.jsx';
import ShopByCategory from '../components/home/ShopByCategory.jsx';
import VirtualTryOnBanner from '../components/home/VirtualTryOnBanner.jsx';
import FeaturedBrands from '../components/home/FeaturedBrands.jsx';
import ClosingBanner from '../components/home/ClosingBanner.jsx';
export default function HomePage({products,brands,fittingUrl}){return <>
 <HeroSection fittingUrl={fittingUrl}/>
 <StoreBenefits/>
 <FeaturedProducts products={products}/>
 <ShopByCategory/>
 <VirtualTryOnBanner fittingUrl={fittingUrl}/>
 <FeaturedBrands brands={brands}/>
 <ClosingBanner/>
</>}
