export const indexGuides: Record<string, string> = {
  // EEG Metrics
  'Focus Index': `
    <strong>Description:</strong> Focus Index indicates the level of cognitive concentration, calculated as the ratio of beta power to the sum of alpha and theta power. High values represent deep focus, while low values indicate distraction.<br/>
    <strong>Formula:</strong> Focus Index = Beta Power / (Alpha Power + Theta Power)<br/>
    <strong>Normal Range:</strong> 0.3 - 1.2 (normal focus), 1.2 - 2.0 (high focus)<br/>
    <strong>Interpretation:</strong> &lt;0.3: Attention deficit or drowsiness; &gt;2.0: Excessive tension or stress.<br/>
    <strong>Reference:</strong> Klimesch, W. (1999). EEG alpha and theta oscillations reflect cognitive and memory performance. Brain Research Reviews, 29(2-3), 169-195; Pope, A.T. et al. (1995). Biological Psychology, 40(1-2), 187-195.
  `,
  'Relaxation Index': `
    <strong>Description:</strong> Relaxation Index measures the mental relaxation state based on relative alpha activity. Higher values indicate more relaxed states.<br/>
    <strong>Formula:</strong> Relaxation Index = Alpha Power / (Alpha Power + Beta Power)<br/>
    <strong>Normal Range:</strong> 0.4 - 0.7 (normal relaxation), 0.7 - 0.9 (deep relaxation)<br/>
    <strong>Interpretation:</strong> &lt;0.4: Tension or stress; &gt;0.9: Excessive relaxation, reduced alertness.<br/>
    <strong>Reference:</strong> Bazanova, O. M., & Vernon, D. (2014). Neuroscience & Biobehavioral Reviews, 44, 94-110.
  `,
  'Stress Index': `
    <strong>Description:</strong> Stress Index represents mental stress and arousal, rising with increased high-frequency (beta, gamma) activity.<br/>
    <strong>Formula:</strong> Stress Index = (Beta Power + Gamma Power) / (Alpha Power + Theta Power)<br/>
    <strong>Normal Range:</strong> 0.5 - 1.5 (normal arousal)<br/>
    <strong>Interpretation:</strong> &lt;0.5: Low arousal or drowsiness; &gt;1.5: High stress or hyperarousal; &gt;2.5: Severe stress.<br/>
    <strong>Reference:</strong> Ahn, J. W., et al. (2019). Sensors, 19(21), 4644.
  `,
  'Hemispheric Balance': `
    <strong>Description:</strong> Hemispheric Balance indicates the balance of alpha activity between left and right hemispheres, reflecting emotional and cognitive bias.<br/>
    <strong>Formula:</strong> (Left Alpha - Right Alpha) / (Left Alpha + Right Alpha)<br/>
    <strong>Normal Range:</strong> -0.2 ~ 0.2 (balanced)<br/>
    <strong>Interpretation:</strong> &lt;-0.2: Right hemisphere dominance (creative, intuitive); &gt;0.2: Left dominance (analytical, logical); &gt;0.5 or &lt;-0.5: Severe imbalance.<br/>
    <strong>Reference:</strong> Davidson, R. J. (2004). Biological Psychology, 67(1-2), 219-234.
  `,
  'Cognitive Load': `
    <strong>Description:</strong> Cognitive Load reflects mental workload and effort based on the theta/alpha ratio.<br/>
    <strong>Formula:</strong> Cognitive Load = Theta Power / Alpha Power<br/>
    <strong>Normal Range:</strong> 0.3 - 0.8 (optimal load)<br/>
    <strong>Interpretation:</strong> &lt;0.3: Low engagement; &gt;0.8: High cognitive load; &gt;1.2: Overload.<br/>
    <strong>Reference:</strong> Gevins, A., & Smith, M. E. (2003). Theoretical Issues in Ergonomics Science, 4(1-2), 113-131.
  `,
  'Emotional Stability': `
    <strong>Description:</strong> Emotional Stability measures emotional regulation capacity based on the ratio of lower frequency to gamma power.<br/>
    <strong>Formula:</strong> Emotional Stability = (Alpha Power + Theta Power) / Gamma Power<br/>
    <strong>Normal Range:</strong> 2.0 - 8.0 (stable state)<br/>
    <strong>Interpretation:</strong> &lt;2.0: Emotional instability or hyperarousal; &gt;8.0: Excessive inhibition or blunted affect.<br/>
    <strong>Reference:</strong> Knyazev, G. G. (2007). Neuroscience & Biobehavioral Reviews, 31(3), 377-395.
  `,
  'Total Power': `
    <strong>Description:</strong> Total Power is the sum of all EEG band powers, indicating overall brain activity.<br/>
    <strong>Formula:</strong> Sum of delta, theta, alpha, beta, gamma band powers<br/>
    <strong>Normal Range:</strong> Varies by individual and context<br/>
    <strong>Interpretation:</strong> Higher values may indicate heightened neural activity; lower values may suggest low arousal or drowsiness.<br/>
    <strong>Reference:</strong> Standard EEG literature.<br/>
  `,

  // PPG Metrics
  'BPM': `
    <strong>Description:</strong> Heart rate in beats per minute, a fundamental metric of cardiovascular health.<br/>
    <strong>Formula:</strong> BPM = 60,000 / Mean RR Interval (ms)<br/>
    <strong>Normal Range:</strong> 60 - 100 bpm (adults at rest); 40 - 60 bpm (trained athletes)<br/>
    <strong>Interpretation:</strong> &lt;60 bpm (bradycardia), &gt;100 bpm (tachycardia), &gt;120 bpm (severe tachycardia).<br/>
    <strong>Reference:</strong> American Heart Association Guidelines (2020).
  `,
  'SDNN': `
    <strong>Description:</strong> Standard deviation of NN intervals, reflecting overall heart rate variability.<br/>
    <strong>Formula:</strong> SDNN = √(Σ(RRᵢ - RR̄)² / (N-1))<br/>
    <strong>Normal Range:</strong> 50 ms (healthy); 20–50 ms (borderline)<br/>
    <strong>Interpretation:</strong> &lt;20 ms: Autonomic dysfunction; &gt;200 ms: Potential arrhythmia.<br/>
    <strong>Reference:</strong> Task Force, ESC (1996). Circulation, 93(5), 1043-1065.
  `,
  'RMSSD': `
    <strong>Description:</strong> Root mean square of successive RR differences, indicating parasympathetic activity.<br/>
    <strong>Formula:</strong> RMSSD = √(Σ(RRᵢ₊₁ - RRᵢ)² / (N-1))<br/>
    <strong>Normal Range:</strong> ~20 ms (healthy)<br/>
    <strong>Interpretation:</strong> &lt;20 ms: Reduced parasympathetic activity; &gt;100 ms: Excessive parasympathetic dominance.<br/>
    <strong>Reference:</strong> Shaffer, F., & Ginsberg, J. P. (2017). Frontiers in Public Health, 5, 258.
  `,
  'PNN50': `
    <strong>Description:</strong> Percentage of successive RR interval differences greater than 50 ms.<br/>
    <strong>Formula:</strong> PNN50 = (NN50 count / Total NN intervals) × 100%<br/>
    <strong>Normal Range:</strong> ~3%<br/>
    <strong>Interpretation:</strong> &lt;3%: Reduced parasympathetic activity; &gt;30%: High variability.<br/>
    <strong>Reference:</strong> Mietus, J. E., et al. (2002). Heart, 88(4), 378-380.
  `,
  'LF': `
    <strong>Description:</strong> Low frequency power (0.04–0.15 Hz), reflecting combined sympathetic and parasympathetic activity.<br/>
    <strong>Normal Range:</strong> 519–1052 ms²<br/>
    <strong>Interpretation:</strong> Low: reduced autonomic activity; High: stress or sympathetic overactivity.<br/>
    <strong>Reference:</strong> ESC Task Force (1996). Circulation, 93(5), 1043-1065.
  `,
  'HF': `
    <strong>Description:</strong> High frequency power (0.15–0.4 Hz), indicating parasympathetic (vagal) activity.<br/>
    <strong>Normal Range:</strong> 657–2147 ms²<br/>
    <strong>Interpretation:</strong> Low: reduced vagal tone; High: excessive parasympathetic activity.<br/>
    <strong>Reference:</strong> Shaffer, F., & Ginsberg, J. P. (2017). Frontiers in Public Health, 5, 258.
  `,
  'LF/HF': `
    <strong>Description:</strong> Ratio of LF to HF power, indicating sympathovagal balance.<br/>
    <strong>Formula:</strong> LF/HF Ratio = LF Power / HF Power<br/>
    <strong>Normal Range:</strong> 0.5–2.0<br/>
    <strong>Interpretation:</strong> &lt;0.5: Parasympathetic dominance; &gt;2.0: Sympathetic dominance; &gt;4.0: Severe imbalance.<br/>
    <strong>Reference:</strong> Billman, G. E. (2013). Frontiers in Physiology, 4, 26.
  `,
  'SDSD': `
    <strong>Description:</strong> Standard deviation of successive RR differences.<br/>
    <strong>Interpretation:</strong> Reflects rapid changes in heart rate variability.<br/>
    <strong>Reference:</strong> Standard HRV literature.
  `,

  // ACC Metrics
  'Activity State': `
    <strong>Description:</strong> Classified physical activity level based on accelerometer data.<br/>
    <strong>Formula:</strong> Movement Magnitude = √(∇x² + ∇y² + ∇z²); Average Movement = mean of magnitude.<br/>
    <strong>Thresholds:</strong> &lt;200: Stationary; 200–600: Sitting; 600–1000: Walking; &gt;1000: Running.<br/>
    <strong>Interpretation:</strong> Correlates with metabolic rate and caloric expenditure.<br/>
    <strong>Reference:</strong> Troiano, R. P., et al. (2008). Medicine & Science in Sports & Exercise, 40(1), 181-188.
  `,
  'Average Movement': `
    <strong>Description:</strong> Mean movement magnitude over the buffer period.<br/>
    <strong>Interpretation:</strong> Higher values indicate more dynamic movement.<br/>
  `,
  'Standard Deviation Movement': `
    <strong>Description:</strong> Variability of movement magnitude.<br/>
    <strong>Interpretation:</strong> High variability: irregular motion; Low variability: consistent activity.<br/>
  `,
  'Max Movement': `
    <strong>Description:</strong> Maximum movement magnitude detected.<br/>
    <strong>Interpretation:</strong> Indicates peak acceleration events.<br/>
  `
}; 