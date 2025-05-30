import { db } from "./db";
import { universities, courses, leads } from "@shared/schema";

export async function seedSampleData() {
  try {
    console.log("🌱 Starting to seed sample data...");

    // Add sample universities
    const sampleUniversities = [
      {
        name: "University of Oxford",
        city: "Oxford",
        country: "United Kingdom",
        imageUrl: "https://images.unsplash.com/photo-1564126220613-7c0c6b8e8f7a?w=400&h=300&fit=crop"
      },
      {
        name: "University of Cambridge",
        city: "Cambridge", 
        country: "United Kingdom",
        imageUrl: "https://images.unsplash.com/photo-1520637836862-4d197d17c936?w=400&h=300&fit=crop"
      },
      {
        name: "Imperial College London",
        city: "London",
        country: "United Kingdom",
        imageUrl: "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400&h=300&fit=crop"
      },
      {
        name: "University College London",
        city: "London",
        country: "United Kingdom",
        imageUrl: "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=400&h=300&fit=crop"
      }
    ];

    console.log("📚 Adding universities...");
    for (const uni of sampleUniversities) {
      try {
        await db.insert(universities).values(uni).onConflictDoNothing();
      } catch (error) {
        console.log(`University ${uni.name} already exists, skipping...`);
      }
    }

    // Get university IDs
    const allUniversities = await db.select().from(universities);
    console.log(`Found ${allUniversities.length} universities`);

    if (allUniversities.length === 0) {
      throw new Error("No universities found after seeding");
    }

    // Add sample courses
    const sampleCourses = [
      {
        name: "Master of Computer Science",
        universityId: allUniversities[0].id,
        level: "Masters",
        duration: "12 months",
        tuitionFee: "35000",
        currency: "£",
        ieltsOverall: "7.0",
        ieltsListening: "6.5",
        ieltsReading: "6.5",
        ieltsWriting: "6.5",
        ieltsSpeaking: "6.5",
        subject: "Computer Science",
        imageUrl: "https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=400&h=300&fit=crop"
      },
      {
        name: "MBA - Master of Business Administration",
        universityId: allUniversities[1].id,
        level: "Masters",
        duration: "24 months",
        tuitionFee: "45000",
        currency: "£",
        ieltsOverall: "7.5",
        ieltsListening: "7.0",
        ieltsReading: "7.0",
        ieltsWriting: "7.0",
        ieltsSpeaking: "7.0",
        subject: "Business",
        imageUrl: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=300&fit=crop"
      },
      {
        name: "MSc Engineering Management",
        universityId: allUniversities[2].id,
        level: "Masters",
        duration: "12 months",
        tuitionFee: "38000",
        currency: "£",
        ieltsOverall: "6.5",
        ieltsListening: "6.0",
        ieltsReading: "6.0",
        ieltsWriting: "6.0",
        ieltsSpeaking: "6.0",
        subject: "Engineering",
        imageUrl: "https://images.unsplash.com/photo-1581092162384-8987c1d64718?w=400&h=300&fit=crop"
      },
      {
        name: "Master of Laws (LLM)",
        universityId: allUniversities[3].id,
        level: "Masters",
        duration: "12 months",
        tuitionFee: "42000",
        currency: "£",
        ieltsOverall: "7.5",
        ieltsListening: "7.0",
        ieltsReading: "7.0",
        ieltsWriting: "7.0",
        ieltsSpeaking: "7.0",
        subject: "Law",
        imageUrl: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&h=300&fit=crop"
      }
    ];

    console.log("🎓 Adding courses...");
    for (const course of sampleCourses) {
      try {
        await db.insert(courses).values(course).onConflictDoNothing();
      } catch (error) {
        console.log(`Course ${course.name} might already exist, skipping...`);
      }
    }

    // Add sample leads
    const sampleLeads = [
      {
        name: "Ahmed Rahman",
        email: "ahmed.rahman@email.com",
        phone: "+8801712345678",
        source: "Website",
        status: "New",
        interestedCourses: "Computer Science, Engineering",
        notes: "Interested in UK universities for Masters degree"
      },
      {
        name: "Fatima Khan",
        email: "fatima.khan@email.com",
        phone: "+8801798765432",
        source: "Facebook",
        status: "Contacted",
        interestedCourses: "Business, MBA",
        notes: "Looking for scholarship opportunities"
      },
      {
        name: "Mohammad Hasan",
        email: "mohammad.hasan@email.com",
        phone: "+8801656789012",
        source: "Google Ads",
        status: "Qualified",
        interestedCourses: "Law",
        notes: "Has IELTS 7.5, ready to apply"
      }
    ];

    console.log("🎯 Adding leads...");
    for (const lead of sampleLeads) {
      try {
        await db.insert(leads).values(lead).onConflictDoNothing();
      } catch (error) {
        console.log(`Lead ${lead.name} might already exist, skipping...`);
      }
    }

    console.log("✅ Sample data seeding completed successfully!");
    
    // Return summary
    const finalUniversities = await db.select().from(universities);
    const finalCourses = await db.select().from(courses);
    const finalLeads = await db.select().from(leads);
    
    return {
      universities: finalUniversities.length,
      courses: finalCourses.length,
      leads: finalLeads.length
    };

  } catch (error) {
    console.error("❌ Error seeding data:", error);
    throw error;
  }
}