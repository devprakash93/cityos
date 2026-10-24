import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../api/axios';
import AnnouncementList from '../../components/announcements/AnnouncementList';
import AnnouncementDetails from '../../components/announcements/AnnouncementDetails';

export default function Announcements() {
  const { slug } = useParams();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deepLinkedAnnouncement, setDeepLinkedAnnouncement] = useState(null);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        setLoading(true);
        const res = await api.get('/announcements/');
        const data = res.data?.results || res.data || [];
        setAnnouncements(data);

        // If deep-linked slug provided in URL, load specific detail
        if (slug) {
          const matched = data.find(a => a.slug === slug || String(a.id) === slug);
          if (matched) {
            setDeepLinkedAnnouncement(matched);
          } else {
            // Fetch directly from detail endpoint
            try {
              const detailRes = await api.get(`/announcements/${slug}/`);
              setDeepLinkedAnnouncement(detailRes.data);
            } catch {}
          }
        }
      } catch (err) {
        console.error('Failed to fetch announcements', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnnouncements();
  }, [slug]);

  return (
    <>
      <AnnouncementList
        announcements={announcements}
        loading={loading}
        title="📢 Official Announcements &amp; Civic Updates"
        subtitle="Government welfare schemes, municipal roadworks, water/power notices, and environmental campaigns for Odisha citizens."
      />

      {/* Deep-linked detail modal if loaded with slug */}
      {deepLinkedAnnouncement && (
        <AnnouncementDetails
          isOpen={Boolean(deepLinkedAnnouncement)}
          announcement={deepLinkedAnnouncement}
          onClose={() => setDeepLinkedAnnouncement(null)}
        />
      )}
    </>
  );
}
