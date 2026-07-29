export default function SentenceForm() {
  return (
    <div className="app-card">
      <input
        type="text"
        className="input-field"
        placeholder="🖼️ İkon (örn: 💬)"
      />

      <textarea
        className="input-field flag-de"
        placeholder="Örn: Ich möchte die Suppe *probieren*."
      />

      <textarea
        className="input-field flag-tr"
        placeholder="Örn: Çorbayı tatmak istiyorum."
      />

      <div className="cloze-info">
        💡 <strong>Cloze:</strong> Boşluk yapmak istediğin kelimeyi{" "}
        <strong>*yıldız*</strong> içine al. Örn:{" "}
        <em>Ich habe *gegessen*.</em>
      </div>

      <select className="input-field" defaultValue="">
        <option value="" disabled>
          Kategori seç
        </option>

        <optgroup label="👨‍🍳 Mutfak & Restoran">
          <option value="Mutfak & Restoran|Genel">Genel</option>
          <option value="Mutfak & Restoran|Müşteri İletişimi">
            Müşteri İletişimi
          </option>
          <option value="Mutfak & Restoran|Sipariş Alma">
            Sipariş Alma
          </option>
        </optgroup>

        <optgroup label="🗣️ Günlük Konuşma">
          <option value="Günlük Konuşma|Genel">Genel</option>
          <option value="Günlük Konuşma|Selamlaşma">Selamlaşma</option>
          <option value="Günlük Konuşma|Alışveriş">Alışveriş</option>
        </optgroup>
      </select>

      <input
        type="text"
        className="input-field grammar-input"
        placeholder="💡 Opsiyonel: Kısa Gramer Bilgisi"
      />

      <button
        type="button"
        className="app-button app-button-primary"
      >
        ✚ Kaydet
      </button>
    </div>
  );
}