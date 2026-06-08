import { StyleSheet } from "@react-pdf/renderer";

/**
 * "Supportive Insight" palette (mirrors apps/app globals.css), adapted for the
 * field-report PDF. Structure follows desk-v1's tax-report-pdf styles so the
 * visual system (cards, section headers, dividers, label/value rows) is shared.
 */
export const brand = {
  primary: "#0040a1",
  primarySoft: "#0056d2",
  secondary: "#006c49",
  error: "#ba1a1a",
  amber: "#865400",
  textPrimary: "#0d1c2e",
  textSecondary: "#0040a1",
  textMuted: "#424654",
  borderFine: "#c3c6d6",
  surfaceLight: "#eff4ff",
  surfaceCard: "#e6eeff",
  white: "#ffffff",
};

export const priorityColor: Record<"ALTA" | "MEDIA" | "BAJA", string> = {
  ALTA: brand.error,
  MEDIA: brand.amber,
  BAJA: brand.secondary,
};

export const styles = StyleSheet.create({
  page: {
    paddingVertical: 36,
    paddingHorizontal: 40,
    fontFamily: "Helvetica",
    fontSize: 9.5,
    color: brand.textPrimary,
    backgroundColor: brand.white,
    lineHeight: 1.4,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  kicker: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: brand.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  title: {
    fontFamily: "Helvetica-Bold",
    fontSize: 20,
    color: brand.primary,
  },
  subtitle: {
    fontSize: 10,
    color: brand.textMuted,
    marginTop: 2,
  },
  pill: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: brand.white,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  accentBar: {
    height: 3,
    backgroundColor: brand.primary,
    borderRadius: 2,
    marginTop: 8,
    marginBottom: 14,
  },
  // Executive summary
  summaryCard: {
    backgroundColor: brand.surfaceLight,
    borderWidth: 1,
    borderColor: brand.borderFine,
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
  },
  summaryLabel: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: brand.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  summaryText: {
    fontSize: 11,
    color: brand.textPrimary,
    lineHeight: 1.45,
  },
  // Sections
  sectionHeader: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    color: brand.primary,
    marginTop: 10,
    marginBottom: 5,
  },
  divider: {
    borderBottomWidth: 0.5,
    borderBottomColor: brand.borderFine,
    marginBottom: 6,
  },
  fieldRow: {
    flexDirection: "row",
    marginBottom: 2.5,
  },
  fieldLabel: {
    width: 150,
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: brand.textMuted,
  },
  fieldValue: {
    flex: 1,
    fontSize: 9.5,
    color: brand.textPrimary,
  },
  bulletRow: {
    flexDirection: "row",
    marginBottom: 2.5,
  },
  bulletDot: {
    width: 10,
    fontSize: 9.5,
    color: brand.primary,
  },
  bulletText: {
    flex: 1,
    fontSize: 9.5,
    color: brand.textPrimary,
  },
  bodyText: {
    fontSize: 9.5,
    color: brand.textPrimary,
    lineHeight: 1.5,
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: brand.borderFine,
    paddingTop: 6,
  },
  footerText: {
    fontSize: 7,
    color: brand.textMuted,
  },
});
