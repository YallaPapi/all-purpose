// Test script for organization_short_description functionality
const apiUrl = 'https://all-purpose-1pd1-git-main-stuartoden-2590s-projects.vercel.app/api/create-prototype';

const testCases = [
  {
    name: 'Automotive - Luxury Dealership',
    payload: {
      companyName: 'Premier Luxury Motors',
      contactName: 'Michael Chen',
      contactEmail: 'michael@premierluxury.com',
      location: 'Beverly Hills, CA',
      title: 'Sales Director',
      industry: 'automotive',
      organization_short_description: 'Luxury car dealership specializing in Mercedes-Benz, BMW, and Audi vehicles'
    }
  },
  {
    name: 'Automotive - Auto Repair Shop',
    payload: {
      companyName: 'Quick Fix Auto Repair',
      contactName: 'Sarah Martinez',
      contactEmail: 'sarah@quickfixauto.com',
      location: 'Phoenix, AZ',
      title: 'Shop Owner',
      industry: 'automotive',
      organization_short_description: 'Full-service auto repair shop providing brake service, oil changes, and transmission repair'
    }
  },
  {
    name: 'Automotive - Corporate Fleet',
    payload: {
      companyName: 'Enterprise Fleet Solutions',
      contactName: 'David Thompson',
      contactEmail: 'david@enterprisefleet.com',
      location: 'Atlanta, GA',
      title: 'Fleet Manager',
      industry: 'automotive',
      organization_short_description: 'Corporate fleet management and vehicle leasing for businesses with 50+ vehicles'
    }
  },
  {
    name: 'Dental - Cosmetic Practice',
    payload: {
      companyName: 'Perfect Smile Cosmetic Dentistry',
      contactName: 'Dr. Jennifer White',
      contactEmail: 'dr.white@perfectsmile.com',
      location: 'Miami, FL',
      title: 'Cosmetic Dentist',
      industry: 'dental',
      organization_short_description: 'Cosmetic dentistry practice specializing in veneers, teeth whitening, and smile makeovers'
    }
  },
  {
    name: 'Dental - Family Practice',
    payload: {
      companyName: 'Family Dental Care',
      contactName: 'Dr. Robert Johnson',
      contactEmail: 'dr.johnson@familydentalcare.com',
      location: 'Toledo, OH',
      title: 'Family Dentist',
      industry: 'dental',
      organization_short_description: 'Family dental practice providing routine cleanings, checkups, and pediatric dental care'
    }
  },
  {
    name: 'Legal - Personal Injury Law',
    payload: {
      companyName: 'Strong & Associates Law Firm',
      contactName: 'Attorney Lisa Strong',
      contactEmail: 'lisa@stronglaw.com',
      location: 'Los Angeles, CA',
      title: 'Managing Partner',
      industry: 'legal',
      organization_short_description: 'Personal injury law firm specializing in car accidents, slip and fall cases, and workers compensation'
    }
  },
  {
    name: 'Legal - Corporate Law',
    payload: {
      companyName: 'Corporate Legal Partners',
      contactName: 'Attorney Mark Davis',
      contactEmail: 'mark@corporatelegal.com',
      location: 'New York, NY',
      title: 'Corporate Attorney',
      industry: 'legal',
      organization_short_description: 'Corporate law firm providing business formation, mergers & acquisitions, and contract law services'
    }
  },
  {
    name: 'Healthcare - Chiropractic Sports Medicine',
    payload: {
      companyName: 'Active Life Chiropractic',
      contactName: 'Dr. James Wilson',
      contactEmail: 'dr.wilson@activelifechiro.com',
      location: 'Denver, CO',
      title: 'Sports Chiropractor',
      industry: 'chiropractic',
      organization_short_description: 'Sports medicine chiropractic clinic specializing in athletic injury recovery and performance optimization'
    }
  }
];

async function testAPI() {
  console.log('🧪 Testing Create-Prototype API with Organization Short Description\n');
  
  for (const testCase of testCases) {
    console.log(`\n📋 Testing: ${testCase.name}`);
    console.log('Industry:', testCase.payload.industry);
    console.log('Description:', testCase.payload.organization_short_description);
    console.log('Company:', testCase.payload.companyName);
    
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testCase.payload)
      });
      
      const result = await response.json();
      
      if (response.ok) {
        console.log('✅ Success:', result.message);
        console.log('   Demo URL:', result.url);
        console.log('   Expected: AI should adapt to specific business type based on description');
      } else {
        console.log('❌ Error:', result.error);
        if (result.details) console.log('   Details:', result.details);
      }
      
    } catch (error) {
      console.log('🚨 Request Failed:', error.message);
    }
    
    console.log('---');
  }
  
  console.log('\n🎯 Expected Behavior:');
  console.log('- Luxury dealership AI should ask about high-end vehicles, financing');
  console.log('- Auto repair shop AI should ask about car problems, maintenance needs');
  console.log('- Fleet management AI should ask about company vehicles, bulk needs');
  console.log('- Cosmetic dentist AI should ask about aesthetic concerns, smile goals');
  console.log('- Family dentist AI should ask about routine care, family dental needs');
  console.log('- Personal injury lawyer AI should ask about accidents, injuries');
  console.log('- Corporate lawyer AI should ask about business legal needs, contracts');
  console.log('- Sports chiropractor AI should ask about athletic injuries, performance');
}

// Check if running directly
if (typeof module !== 'undefined' && require.main === module) {
  testAPI().catch(console.error);
}

module.exports = { testCases, testAPI };