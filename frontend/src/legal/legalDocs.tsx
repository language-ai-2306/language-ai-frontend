/**
 * Legal documents — Terms of Service and Privacy Policy, in two audiences:
 *   • 'user'      — children and their parents/guardians (the companion app)
 *   • 'therapist' — speech pathologists / clinicians (the doctor portal)
 *
 * Written for Australia (Privacy Act 1988 (Cth) + the Australian Privacy
 * Principles), a health-data context (voice recordings and speech assessments
 * are "sensitive information"/"health information"), and use by hospitals and
 * speech-pathology services.
 *
 * ⚠️  DRAFT — NOT LEGAL ADVICE. These are templates only. They MUST be reviewed
 * and adapted by a qualified Australian legal practitioner (and, where relevant,
 * against the health-records legislation of the applicable State/Territory)
 * before you rely on them. Fill every [BRACKETED] placeholder before launch.
 */

export type LegalAudience = 'user' | 'therapist';
export type LegalKind = 'terms' | 'privacy';

/** A content block: a paragraph (string) or a bullet list ({ list }). */
export type LegalBlock = string | { list: string[] };

export interface LegalSection {
  heading: string;
  blocks: LegalBlock[];
}

export interface LegalDoc {
  audience: LegalAudience;
  kind: LegalKind;
  title: string;
  /** One-line summary shown under the title. */
  blurb: string;
  sections: LegalSection[];
}

/* Entity + contact placeholders — set these in one place before launch. */
const ORG = {
  name: '[LEGAL ENTITY NAME] (trading as LanguageAI)',
  abn: '[ABN]',
  privacyEmail: '[privacy@your-domain.com.au]',
  supportEmail: '[support@your-domain.com.au]',
  address: '[Registered address, State/Territory, Australia]',
  jurisdiction: '[State/Territory], Australia',
  hosting: 'Australian data-centre regions of our cloud provider (Amazon Web Services)',
  updated: '[Last updated: DD Month 2026]',
};

/* ---------------------------------------------------------------- *
 *  PRIVACY POLICY — USER (child + parent/guardian)
 * ---------------------------------------------------------------- */
const privacyUser: LegalDoc = {
  audience: 'user',
  kind: 'privacy',
  title: 'Privacy Policy — Children & Families',
  blurb: `How LanguageAI collects, uses, stores and protects your child's information, including voice recordings. ${ORG.updated}`,
  sections: [
    {
      heading: '1. Who we are',
      blocks: [
        `LanguageAI is operated by ${ORG.name} (ABN ${ORG.abn}), ${ORG.address}. We are bound by the Privacy Act 1988 (Cth) and the Australian Privacy Principles (APPs). This policy explains how we handle the personal and health information of children who use the app and of their parents/guardians.`,
        `LanguageAI is a speech-practice support tool used alongside care provided by a speech pathologist, clinic or hospital ("your clinician"). In many cases your clinician or their organisation decides why your child's information is collected; we handle it on their behalf and as described here.`,
      ],
    },
    {
      heading: '2. Consent — please read before you agree',
      blocks: [
        `By ticking "I agree" and using LanguageAI, the parent or legal guardian gives express consent, on behalf of the child, for us to collect and process the information described below — including audio recordings of the child's voice and speech, which is sensitive/health information under the Privacy Act.`,
        `A child cannot give this consent themselves. The account must be set up and consented to by a parent or legal guardian aged 18 or over. You can withdraw your consent at any time (see section 9); withdrawing consent means the app can no longer be used for the child.`,
      ],
    },
    {
      heading: '3. What we collect',
      blocks: [
        'We collect only what is needed to provide the service:',
        {
          list: [
            'Account details: the child\'s first name or nickname, age/date of birth, avatar choice, and the parent/guardian\'s name and contact details.',
            'Voice recordings: audio of the child speaking during exercises (e.g. reading aloud, repeating phrases, talking with the "Ollie" companion).',
            'Speech and progress information: transcripts, fluency/pronunciation scores, disfluency markers and other results generated from the recordings — this is health information.',
            'Usage information: which exercises were completed, timestamps, and basic technical/device information needed to run and secure the app.',
          ],
        },
        'We do not knowingly collect more information than we need, and we do not sell personal information.',
      ],
    },
    {
      heading: '4. How we use it',
      blocks: [
        'We use the information to:',
        {
          list: [
            'Run the exercises and give the child spoken feedback and a talking avatar.',
            'Analyse the recordings to measure speech and track progress over time.',
            'Make results available to the child\'s clinician so they can guide therapy.',
            'Keep the service secure, and meet our legal and record-keeping obligations.',
          ],
        },
        'We do not use your child\'s recordings for advertising. We only use de-identified information to improve the service, and only where permitted by law.',
      ],
    },
    {
      heading: '5. How audio is processed',
      blocks: [
        `When the child completes an exercise, the recording is securely sent to our servers (hosted in ${ORG.hosting}) where it is processed by automated speech-analysis and AI tools to generate scores and feedback. Recordings and results are stored so the child and their clinician can review progress.`,
        'Automated processing does not make clinical decisions on its own — your clinician remains responsible for the child\'s care.',
      ],
    },
    {
      heading: '6. Who we share it with',
      blocks: [
        'We share information only with:',
        {
          list: [
            'Your child\'s clinician and their organisation (the clinic, hospital or speech-pathology service) delivering care.',
            'Service providers who host and secure our systems, under contracts that require them to protect the information and use it only for us.',
            'Others where required or authorised by law (for example, to protect someone\'s safety, or in response to a lawful request).',
          ],
        },
        'We do not disclose your child\'s information to anyone else without your consent.',
      ],
    },
    {
      heading: '7. Storage, security and overseas',
      blocks: [
        `We store information in ${ORG.hosting} and take reasonable steps to protect it — including encryption in transit and at rest, access controls, and restricting access to those who need it.`,
        'Where any service provider may access or store information outside Australia, we take reasonable steps to ensure they handle it consistently with the APPs. If this applies, the countries involved will be listed here: [list overseas countries, if any].',
      ],
    },
    {
      heading: '8. How long we keep it',
      blocks: [
        'Because LanguageAI supports clinical care, recordings and results may need to be kept for the period required by your clinician\'s organisation and by law (health records are often required to be retained for a minimum period, including for children until a set age). We keep information only as long as needed for these purposes, then destroy or de-identify it. Your clinician\'s organisation can tell you the retention period that applies to your child\'s records.',
      ],
    },
    {
      heading: '9. Your rights — access, correction, withdrawal',
      blocks: [
        'As the parent/guardian you can, at any time:',
        {
          list: [
            'Ask to access the personal and health information we hold about your child (APP 12).',
            'Ask us to correct information that is wrong (APP 13).',
            'Withdraw consent and ask us to stop processing and to delete your child\'s recordings, subject to any records your clinician is legally required to keep.',
          ],
        },
        `To make a request, contact us at ${ORG.privacyEmail}. We may need to verify your identity first. Some access requests may instead need to go through your clinician\'s organisation where they hold the clinical record.`,
      ],
    },
    {
      heading: '10. Complaints',
      blocks: [
        `If you have a privacy concern, contact us at ${ORG.privacyEmail} and we will respond within a reasonable time. If you are not satisfied, you can complain to the Office of the Australian Information Commissioner (OAIC) at oaic.gov.au, or to the relevant State/Territory health-complaints body.`,
      ],
    },
    {
      heading: '11. Data breaches',
      blocks: [
        'If a data breach is likely to cause you serious harm, we will notify you and the OAIC as required by the Notifiable Data Breaches scheme, and work with your clinician\'s organisation to respond.',
      ],
    },
    {
      heading: '12. Changes',
      blocks: [
        'We may update this policy. If we make a significant change affecting how we handle your child\'s information, we will let you know and, where required, seek fresh consent.',
      ],
    },
  ],
};

/* ---------------------------------------------------------------- *
 *  TERMS OF SERVICE — USER (child + parent/guardian)
 * ---------------------------------------------------------------- */
const termsUser: LegalDoc = {
  audience: 'user',
  kind: 'terms',
  title: 'Terms of Service — Children & Families',
  blurb: `The terms for parents/guardians who set up and supervise a child's use of LanguageAI. ${ORG.updated}`,
  sections: [
    {
      heading: '1. About these terms',
      blocks: [
        `These terms are an agreement between you (the parent or legal guardian) and ${ORG.name} (ABN ${ORG.abn}). By ticking "I agree" and creating an account, you accept these terms on behalf of yourself and the child. If you do not agree, do not use LanguageAI.`,
      ],
    },
    {
      heading: '2. LanguageAI is a support tool, not medical advice',
      blocks: [
        'LanguageAI provides speech-practice games and automated feedback to support therapy. It is not a diagnosis, not a substitute for professional advice, and does not replace your child\'s speech pathologist or doctor. It should be used alongside, and under the guidance of, your child\'s clinician. Always follow your clinician\'s advice. If you have urgent health concerns, contact a health professional or call 000.',
      ],
    },
    {
      heading: '3. Who may use it',
      blocks: [
        'The account must be created and supervised by a parent or legal guardian aged 18 or over. You are responsible for supervising the child\'s use, keeping login details secure, and for activity on the account.',
      ],
    },
    {
      heading: '4. Consent to voice recording',
      blocks: [
        'Using LanguageAI involves recording the child\'s voice and sending it to our servers to be analysed. By agreeing, you consent to this on the child\'s behalf. How recordings are handled is set out in our Privacy Policy — Children & Families. You can withdraw consent and stop using the app at any time.',
      ],
    },
    {
      heading: '5. Acceptable use',
      blocks: [
        'You agree to use LanguageAI only for its intended purpose. You must not misuse it, attempt to access it in an unauthorised way, upload harmful content, or record anyone without the right to do so.',
      ],
    },
    {
      heading: '6. Your consumer rights',
      blocks: [
        'Our services come with guarantees that cannot be excluded under the Australian Consumer Law. Nothing in these terms limits those rights. To the extent permitted by law, LanguageAI is provided "as is", and we are not liable for loss that is not reasonably foreseeable or that does not arise from our failure to meet a consumer guarantee.',
      ],
    },
    {
      heading: '7. Intellectual property',
      blocks: [
        'We (and our licensors) own the app, its content and the "Ollie" character. You are given a personal, non-transferable licence to use the app for the child\'s therapy. The child\'s recordings and results belong to the child/family and are handled as described in the Privacy Policy.',
      ],
    },
    {
      heading: '8. Suspension and ending use',
      blocks: [
        'You can stop using LanguageAI and ask us to close the account at any time. We may suspend or end access if these terms are breached or if required for safety, security or legal reasons.',
      ],
    },
    {
      heading: '9. Governing law',
      blocks: [
        `These terms are governed by the laws of ${ORG.jurisdiction}, and the courts of that place have jurisdiction. Questions? Contact ${ORG.supportEmail}.`,
      ],
    },
  ],
};

/* ---------------------------------------------------------------- *
 *  PRIVACY POLICY — THERAPIST / CLINICIAN
 * ---------------------------------------------------------------- */
const privacyTherapist: LegalDoc = {
  audience: 'therapist',
  kind: 'privacy',
  title: 'Privacy Policy — Clinicians',
  blurb: `How LanguageAI handles clinician and patient information, and your obligations as a health-service provider. ${ORG.updated}`,
  sections: [
    {
      heading: '1. Scope',
      blocks: [
        `This policy applies to speech pathologists and other clinicians who use the LanguageAI clinician portal, operated by ${ORG.name} (ABN ${ORG.abn}). We are bound by the Privacy Act 1988 (Cth) and the Australian Privacy Principles. You and your organisation are also bound by the Privacy Act and, where applicable, State/Territory health-records legislation.`,
      ],
    },
    {
      heading: '2. Our role and yours',
      blocks: [
        'For patient information, your organisation is generally the entity that decides the purpose of collection (the treating health-service provider). LanguageAI provides the platform and handles patient information on your behalf and under your clinical direction. You remain responsible for the clinical care and for meeting your own privacy and professional obligations.',
      ],
    },
    {
      heading: '3. Clinician information we collect',
      blocks: [
        'For your clinician account we collect your name, professional email and phone, and information needed to verify and secure your access. We may collect audit logs of actions taken in the portal for security and record-keeping.',
      ],
    },
    {
      heading: '4. Patient information you access',
      blocks: [
        'Through the portal you access patients\' personal and health information — including voice recordings, speech assessments, scores, and treatment plans. This is sensitive information. You must only access records of patients in your care, only for legitimate clinical purposes, and in line with your organisation\'s policies.',
      ],
    },
    {
      heading: '5. Your consent obligations',
      blocks: [
        'Before enrolling a patient (a child) on LanguageAI, you or your organisation are responsible for obtaining valid, informed consent from the patient\'s parent or legal guardian for the collection and processing of the child\'s voice recordings and health information, consistent with the Privacy Act and your professional standards (including Speech Pathology Australia guidance and, for regulated practitioners, applicable AHPRA/registration obligations). You must keep evidence of that consent.',
      ],
    },
    {
      heading: '6. Use, storage, security and overseas',
      blocks: [
        `Patient information is stored in ${ORG.hosting} with encryption in transit and at rest, role-based access controls and audit logging. Where a service provider may access information outside Australia, we take reasonable steps to ensure APP-consistent handling; any such countries are listed here: [list, if any].`,
        'You must keep your credentials secure, access the portal only from appropriate devices, and not export or disclose patient information except as permitted by law and your organisation.',
      ],
    },
    {
      heading: '7. Retention',
      blocks: [
        'Health records must be retained for the minimum periods set by law and your organisation\'s policy (including longer periods for children\'s records). Retention and destruction are managed in line with those requirements; contact us to configure retention for your organisation.',
      ],
    },
    {
      heading: '8. Access, correction and breaches',
      blocks: [
        'Patients (via their guardian) may seek access to and correction of their information under APPs 12–13; where you hold the clinical record, such requests may be directed to your organisation. We support the Notifiable Data Breaches scheme and will work with your organisation to assess and notify eligible breaches.',
      ],
    },
    {
      heading: '9. Contact and complaints',
      blocks: [
        `Privacy questions or complaints: ${ORG.privacyEmail}. Unresolved concerns may be raised with the OAIC (oaic.gov.au) or the relevant State/Territory health-complaints commissioner.`,
      ],
    },
  ],
};

/* ---------------------------------------------------------------- *
 *  TERMS OF SERVICE — THERAPIST / CLINICIAN
 * ---------------------------------------------------------------- */
const termsTherapist: LegalDoc = {
  audience: 'therapist',
  kind: 'terms',
  title: 'Terms of Service — Clinicians',
  blurb: `The terms for speech pathologists and clinical staff using the LanguageAI portal. ${ORG.updated}`,
  sections: [
    {
      heading: '1. Agreement',
      blocks: [
        `These terms govern your use of the LanguageAI clinician portal, provided by ${ORG.name} (ABN ${ORG.abn}). By creating a clinician account you accept them on your own behalf and, where you act for an organisation, on its behalf. Your organisation may also have a separate services agreement with us, which prevails over these terms to the extent of any inconsistency.`,
      ],
    },
    {
      heading: '2. Eligibility and professional responsibility',
      blocks: [
        'You warrant that you are a qualified/registered practitioner (or authorised clinical staff) entitled to deliver the relevant services, and that you will comply with your professional, ethical and registration obligations (including, where applicable, AHPRA and Speech Pathology Australia standards). LanguageAI is a clinical support tool; it does not provide clinical judgement, and you remain solely responsible for diagnosis, treatment and care decisions.',
      ],
    },
    {
      heading: '3. Consent and patient data',
      blocks: [
        'You are responsible for obtaining and recording valid parent/guardian consent before enrolling a child and processing their voice recordings and health information, and for accessing only the records of patients in your care, for legitimate purposes. You must comply with the Privacy Act, applicable health-records legislation, and your organisation\'s information-governance policies.',
      ],
    },
    {
      heading: '4. Acceptable use and security',
      blocks: [
        'You must keep credentials confidential, not share accounts, use the portal only for authorised clinical purposes, and not attempt to circumvent security or export data other than as permitted. Notify us promptly of any suspected unauthorised access or data breach.',
      ],
    },
    {
      heading: '5. Availability and clinical safety',
      blocks: [
        'We aim to provide a reliable service but do not guarantee uninterrupted availability. LanguageAI must not be relied on for emergency or time-critical care. Automated outputs (scores, feedback, summaries) are decision-support only and must be clinically reviewed before use.',
      ],
    },
    {
      heading: '6. Liability',
      blocks: [
        'Nothing in these terms excludes rights or guarantees that cannot be excluded under the Australian Consumer Law. Subject to that, and to the maximum extent permitted by law, our liability is limited as set out in your organisation\'s services agreement (or, if none, to re-supplying the service), and we are not liable for clinical decisions made using the platform.',
      ],
    },
    {
      heading: '7. Suspension and termination',
      blocks: [
        'We may suspend or terminate access for breach, security or legal reasons. On termination, access to the portal ends; handling of patient records after termination is governed by your organisation\'s agreement and applicable retention law.',
      ],
    },
    {
      heading: '8. Governing law',
      blocks: [
        `These terms are governed by the laws of ${ORG.jurisdiction}. Contact ${ORG.supportEmail} with any questions.`,
      ],
    },
  ],
};

const DOCS: LegalDoc[] = [privacyUser, termsUser, privacyTherapist, termsTherapist];

/** Look up a document by audience + kind. */
export function getLegalDoc(audience: LegalAudience, kind: LegalKind): LegalDoc {
  return DOCS.find((d) => d.audience === audience && d.kind === kind) ?? DOCS[0];
}
