class Sheet {
  final String id;
  final String sessionId;
  final String? submissionId;
  final String? studentIdRaw;
  final String? studentIdConfirmed;
  final String imageUrl;
  final String? ocrText;
  final Map<String, dynamic>? ocrMetadata;
  final double? idConfidence;
  final bool flagged;
  final int uploadOrder;

  const Sheet({
    required this.id,
    required this.sessionId,
    this.submissionId,
    this.studentIdRaw,
    this.studentIdConfirmed,
    required this.imageUrl,
    this.ocrText,
    this.ocrMetadata,
    this.idConfidence,
    required this.flagged,
    required this.uploadOrder,
  });

  factory Sheet.fromJson(Map<String, dynamic> json) => Sheet(
        id: json['id'] as String,
        sessionId: json['session_id'] as String,
        submissionId: json['submission_id'] as String?,
        studentIdRaw: json['student_id_raw'] as String?,
        studentIdConfirmed: json['student_id_confirmed'] as String?,
        imageUrl: json['image_url'] as String,
        ocrText: json['ocr_text'] as String?,
        ocrMetadata: json['ocr_metadata'] as Map<String, dynamic>?,
        idConfidence: (json['id_confidence'] as num?)?.toDouble(),
        flagged: json['flagged'] as bool? ?? false,
        uploadOrder: json['upload_order'] as int,
      );
}

class OcrResult {
  final String text;
  final Map<String, dynamic> metadata;

  const OcrResult({required this.text, required this.metadata});
}
