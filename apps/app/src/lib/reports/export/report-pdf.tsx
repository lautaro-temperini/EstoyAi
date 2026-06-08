import { Document, Page, View, Text, pdf } from "@react-pdf/renderer";
import type { FieldReport } from "../schema";
import { buildReportContent, type ReportContent, type Section } from "./content";
import { styles, priorityColor } from "./styles";

/**
 * One-page field-report PDF. Executive summary first, then the structured
 * sections. Built with @react-pdf/renderer (client-side `pdf().toBlob()`),
 * default Helvetica so it works fully offline with no font fetch.
 */

function SectionView({ section }: { section: Section }) {
  return (
    <View wrap={false}>
      <Text style={styles.sectionHeader}>{section.title}</Text>
      <View style={styles.divider} />
      {section.kind === "fields" &&
        section.fields.map((f, i) => (
          <View style={styles.fieldRow} key={i}>
            <Text style={styles.fieldLabel}>{f.label}</Text>
            <Text style={styles.fieldValue}>{f.value}</Text>
          </View>
        ))}
      {section.kind === "bullets" &&
        section.items.map((it, i) => (
          <View style={styles.bulletRow} key={i}>
            <Text style={styles.bulletDot}>•</Text>
            <Text style={styles.bulletText}>{it}</Text>
          </View>
        ))}
      {section.kind === "text" && <Text style={styles.bodyText}>{section.body}</Text>}
    </View>
  );
}

function ReportDocument({ content }: { content: ReportContent }) {
  return (
    <Document
      title={`Informe de Campo — ${content.titular}`}
      author="Smart NGO Voice Reports"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.kicker}>Informe de Campo</Text>
            <Text style={styles.title}>{content.titular}</Text>
            <Text style={styles.subtitle}>
              {content.fecha}
              {content.lugar ? ` · ${content.lugar}` : ""}
            </Text>
          </View>
          <Text style={[styles.pill, { backgroundColor: priorityColor[content.prioridad] }]}>
            {content.prioridad}
          </Text>
        </View>
        <View style={styles.accentBar} />

        {/* Executive summary — first. */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Resumen Ejecutivo</Text>
          <Text style={styles.summaryText}>{content.resumenEjecutivo}</Text>
        </View>

        {content.sections.map((s, i) => (
          <SectionView section={s} key={i} />
        ))}

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            Generado en campo con inferencia local · Smart NGO Voice Reports
          </Text>
          <Text style={styles.footerText}>{content.generadoEl}</Text>
        </View>
      </Page>
    </Document>
  );
}

/** Render the report to a PDF Blob (client-side). */
export async function renderReportPdfBlob(report: FieldReport): Promise<Blob> {
  const content = buildReportContent(report);
  return pdf(<ReportDocument content={content} />).toBlob();
}
