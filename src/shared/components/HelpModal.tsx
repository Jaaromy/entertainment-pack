interface HelpControl {
  action: string;
  description: string;
}

interface HelpSection {
  title?: string;
  controls: HelpControl[];
}

interface HelpModalProps {
  title: string;
  sections: HelpSection[];
  onClose: () => void;
}

export default function HelpModal({ title, sections, onClose }: HelpModalProps) {
  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-box help-modal-box" onClick={e => e.stopPropagation()}>
        <h3>{title}</h3>
        {sections.map((section, i) => (
          <div key={i} className="help-modal-section">
            {section.title && <div className="help-modal-section-title">{section.title}</div>}
            <table className="help-modal-table">
              <tbody>
                {section.controls.map((ctrl, j) => (
                  <tr key={j}>
                    <td className="help-modal-action">{ctrl.action}</td>
                    <td className="help-modal-desc">{ctrl.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
        <div className="dialog-actions">
          <button className="klondike-btn klondike-btn--primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
