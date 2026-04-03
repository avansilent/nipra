import { NextResponse } from "next/server";
import { createStudentEmail, createTempPassword, sanitizeLoginId } from "../../../../lib/admin/route";
import { createSupabaseServiceClient } from "../../../../lib/supabase/service";

type AdmissionPayload = {
  courseId?: string;
  studentName?: string;
  guardianName?: string;
  phone?: string;
  email?: string;
  board?: string;
  classLevel?: string;
  address?: string;
  interest?: string;
  paymentReference?: string;
  confirmedPayment?: boolean;
};

type CourseRecord = {
  id: string;
  institute_id: string | null;
  title: string;
  price_text: string | null;
  status: string;
};

async function createUniqueLoginId(
  serviceClient: ReturnType<typeof createSupabaseServiceClient>,
  seed: string
) {
  const fallbackBase = `student-${Date.now().toString().slice(-6)}`;
  const base = sanitizeLoginId(seed) || fallbackBase;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const suffix = attempt === 0 ? "" : `-${Date.now().toString().slice(-4)}${attempt}`;
    const candidate = sanitizeLoginId(`${base}${suffix}`) || `${fallbackBase}-${attempt}`;
    const { data, error } = await serviceClient
      .from("users")
      .select("id")
      .eq("login_id", candidate)
      .maybeSingle();

    if (!error && !data) {
      return candidate;
    }
  }

  return sanitizeLoginId(`student-${Date.now().toString().slice(-8)}`) || fallbackBase;
}

export async function POST(request: Request) {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "Supabase service credentials are missing." }, { status: 500 });
    }

    const body = (await request.json()) as AdmissionPayload;
    const courseId = String(body.courseId ?? "").trim();
    const studentName = String(body.studentName ?? "").trim();
    const guardianName = String(body.guardianName ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const board = String(body.board ?? "").trim();
    const classLevel = String(body.classLevel ?? "").trim();
    const address = String(body.address ?? "").trim();
    const interest = String(body.interest ?? "").trim();
    const paymentReference = String(body.paymentReference ?? "").trim().toUpperCase();
    const phone = String(body.phone ?? "").replace(/\D/g, "");

    if (!courseId) {
      return NextResponse.json({ error: "Please choose a course before continuing." }, { status: 400 });
    }

    if (!studentName || !guardianName || !classLevel) {
      return NextResponse.json({ error: "Please complete the student, guardian, and class details." }, { status: 400 });
    }

    if (phone.length < 10) {
      return NextResponse.json({ error: "Please enter a valid mobile number." }, { status: 400 });
    }

    if (!paymentReference || paymentReference.length < 6) {
      return NextResponse.json({ error: "Enter the UPI payment reference after making the payment." }, { status: 400 });
    }

    if (!body.confirmedPayment) {
      return NextResponse.json({ error: "Please confirm that the payment has been completed." }, { status: 400 });
    }

    const serviceClient = createSupabaseServiceClient();

    const { data: course, error: courseError } = await serviceClient
      .from("courses")
      .select("id, institute_id, title, price_text, status")
      .eq("id", courseId)
      .eq("status", "published")
      .maybeSingle();

    const selectedCourse = course as CourseRecord | null;

    if (courseError || !selectedCourse || !selectedCourse.institute_id) {
      return NextResponse.json({ error: "That course is not available for admission right now." }, { status: 404 });
    }

    if (email) {
      const { data: existingEmail } = await serviceClient
        .from("users")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (existingEmail) {
        return NextResponse.json(
          { error: "That email is already registered. Use student login or try another email." },
          { status: 409 }
        );
      }
    }

    const loginId = await createUniqueLoginId(serviceClient, `${studentName}-${phone.slice(-4)}`);
    const finalEmail = email || createStudentEmail(loginId);
    const password = createTempPassword();

    const { data: created, error: createError } = await serviceClient.auth.admin.createUser({
      email: finalEmail,
      password,
      email_confirm: true,
      user_metadata: {
        name: studentName,
        full_name: studentName,
        role: "student",
        institute_id: selectedCourse.institute_id,
        login_id: loginId,
        guardian_name: guardianName,
        phone,
        board,
        class_level: classLevel,
        address,
        payment_reference: paymentReference,
        admission_interest: interest || null,
        admission_source: "public-join-flow",
        enrolled_course_id: selectedCourse.id,
        enrolled_course_title: selectedCourse.title,
      },
      app_metadata: {
        role: "student",
        institute_id: selectedCourse.institute_id,
      },
    });

    if (createError || !created.user) {
      return NextResponse.json({ error: createError?.message ?? "Unable to complete admission." }, { status: 400 });
    }

    const { error: enrollmentError } = await serviceClient.from("enrollments").upsert(
      {
        student_id: created.user.id,
        course_id: selectedCourse.id,
        institute_id: selectedCourse.institute_id,
      },
      { onConflict: "student_id,course_id" }
    );

    if (enrollmentError) {
      await serviceClient.auth.admin.deleteUser(created.user.id);
      return NextResponse.json({ error: "Payment recorded, but course enrollment could not be completed." }, { status: 400 });
    }

    await serviceClient
      .from("users")
      .update({
        name: studentName,
        email: finalEmail,
        login_id: loginId,
        role: "student",
      })
      .eq("id", created.user.id);

    return NextResponse.json({
      student: {
        name: studentName,
      },
      course: {
        title: selectedCourse.title,
        priceText: selectedCourse.price_text,
      },
      credentials: {
        studentId: loginId,
        email: finalEmail,
        password,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to complete admission.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}